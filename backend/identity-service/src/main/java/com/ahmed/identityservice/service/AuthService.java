package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.exception.AccountLockedException;
import com.ahmed.identityservice.exception.EmailAlreadyExistsException;
import com.ahmed.identityservice.exception.EmailNotVerifiedException;
import com.ahmed.identityservice.exception.InvalidTokenException;
import com.ahmed.identityservice.exception.ResourceNotFoundException;
import com.ahmed.identityservice.model.*;
import com.ahmed.identityservice.notification.NotificationPort;
import com.ahmed.identityservice.repository.*;
import com.ahmed.identityservice.security.DeviceUtils;
import com.ahmed.identityservice.security.JwtTokenProvider;
import com.ahmed.identityservice.security.PrivacyUtils;
import com.ahmed.identityservice.security.TokenHashService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenHashService tokenHashService;
    private final NotificationPort notificationPort;
    private final AuditService auditService;

    @Transactional
    public AuthResult register(RegisterRequest request, String ipAddress, String userAgent) {
        String normalizedEmail = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email is already registered: " + normalizedEmail);
        }

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .name("ROLE_USER")
                        .description("Standard User")
                        .build()));

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .phoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : null)
                .countryCode(request.countryCode() != null ? request.countryCode().trim() : null)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(false)
                .roles(new HashSet<>(Set.of(userRole)))
                .build();

        user = userRepository.save(user);

        // Generate email verification token
        String rawVerifyToken = tokenHashService.generateSecureToken();
        String hashedVerifyToken = tokenHashService.hashToken(rawVerifyToken);
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .userId(user.getId())
                .tokenHash(hashedVerifyToken)
                .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        try {
            notificationPort.sendEmailVerification(user.getEmail(), rawVerifyToken);
        } catch (Exception e) {
            log.warn("Failed to dispatch email verification: {}", e.getMessage());
        }

        // Issue access token and refresh token
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String rawRefreshToken = tokenHashService.generateSecureToken();
        String hashedRefreshToken = tokenHashService.hashToken(rawRefreshToken);

        UUID sessionId = UUID.randomUUID();
        String deviceLabel = DeviceUtils.parseDeviceLabel(userAgent, null);

        RefreshToken refreshToken = RefreshToken.builder()
                .sessionId(sessionId)
                .userId(user.getId())
                .tokenHash(hashedRefreshToken)
                .deviceInfo(deviceLabel)
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .lastUsedAt(Instant.now())
                .build();
        refreshTokenRepository.save(refreshToken);

        auditService.logSecurityEvent("USER_REGISTERED", user.getId(), user.getEmail(), ipAddress, userAgent, null, 0, sessionId);

        AuthResponse authResponse = AuthResponse.of(
                accessToken,
                jwtTokenProvider.getExpiresInSeconds(),
                UserProfileResponse.from(user)
        );

        return new AuthResult(authResponse, rawRefreshToken);
    }

    public AuthResult register(RegisterRequest request) {
        return register(request, "127.0.0.1", "UNKNOWN");
    }

    @Transactional(noRollbackFor = {BadCredentialsException.class, AccountLockedException.class})
    public AuthResult login(LoginRequest request, String ipAddress, String userAgent) {
        String normalizedEmail = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        // Check account lock
        if (user.getLockedUntil() != null) {
            if (user.getLockedUntil().isAfter(Instant.now())) {
                auditService.logSecurityEvent("LOGIN_BLOCKED_LOCKED", user.getId(), user.getEmail(), ipAddress, userAgent, "Account is currently locked", 70);
                throw new AccountLockedException("Account is temporarily locked due to too many failed attempts. Please try again later.");
            } else {
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
            }
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            auditService.logSecurityEvent("LOGIN_BLOCKED_SUSPENDED", user.getId(), user.getEmail(), ipAddress, userAgent, "Suspended account access attempt", 80);
            throw new AccountLockedException("Account has been suspended. Please contact support.");
        }
        if (user.getStatus() == UserStatus.DELETED) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= 5) {
                user.setLockedUntil(Instant.now().plus(15, ChronoUnit.MINUTES));
                userRepository.save(user);
                auditService.logSecurityEvent("ACCOUNT_LOCKED", user.getId(), user.getEmail(), ipAddress, userAgent, "Locked for 15m after 5 failed attempts", 90);
                throw new AccountLockedException("Account locked for 15 minutes due to 5 consecutive failed login attempts.");
            }
            userRepository.save(user);
            auditService.logSecurityEvent("LOGIN_FAILED", user.getId(), user.getEmail(), ipAddress, userAgent, "Failed attempt " + attempts + "/5", attempts * 10);
            throw new BadCredentialsException("Invalid email or password");
        }

        // Reset failed login counter and set last login timestamp
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        // Check for suspicious login: new device or network
        List<RefreshToken> activeTokens = refreshTokenRepository.findActiveTokensByUserId(user.getId(), Instant.now());
        boolean knownDevice = activeTokens.stream()
                .anyMatch(t -> (ipAddress != null && ipAddress.equals(t.getIpAddress()))
                        || (userAgent != null && userAgent.equals(t.getUserAgent())));

        UUID sessionId = UUID.randomUUID();
        String deviceLabel = DeviceUtils.parseDeviceLabel(userAgent, null);

        if (!knownDevice && !activeTokens.isEmpty()) {
            auditService.logSecurityEvent("LOGIN_NEW_DEVICE", user.getId(), user.getEmail(), ipAddress, userAgent, "Login from new device or network", 25, sessionId);
        } else {
            auditService.logSecurityEvent("LOGIN_SUCCESS", user.getId(), user.getEmail(), ipAddress, userAgent, null, 0, sessionId);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String rawRefreshToken = tokenHashService.generateSecureToken();
        String hashedRefreshToken = tokenHashService.hashToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .sessionId(sessionId)
                .userId(user.getId())
                .tokenHash(hashedRefreshToken)
                .deviceInfo(deviceLabel)
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .lastUsedAt(Instant.now())
                .build();
        refreshTokenRepository.save(refreshToken);

        AuthResponse authResponse = AuthResponse.of(
                accessToken,
                jwtTokenProvider.getExpiresInSeconds(),
                UserProfileResponse.from(user)
        );

        return new AuthResult(authResponse, rawRefreshToken);
    }

    public AuthResult login(LoginRequest request) {
        return login(request, "127.0.0.1", "UNKNOWN");
    }

    @Transactional(noRollbackFor = {InvalidTokenException.class})
    public AuthResult refresh(String rawRefreshToken, String ipAddress, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new InvalidTokenException("Refresh token is required");
        }

        String hashedToken = tokenHashService.hashToken(rawRefreshToken);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> new InvalidTokenException("Invalid refresh token"));

        // Reuse Detection: if already revoked, potential token theft -> revoke token family
        if (refreshToken.isRevoked()) {
            log.error("SECURITY ALERT: Reuse of revoked refresh token detected for user ID: {}! Revoking all user tokens.",
                    refreshToken.getUserId());
            auditService.logSecurityEvent("REFRESH_TOKEN_REUSE_DETECTED", refreshToken.getUserId(), null, ipAddress, userAgent,
                    "Revoked token hash reused; revoked token family", 100, refreshToken.getSessionId());

            refreshTokenRepository.revokeAllActiveTokensForUserWithReason(refreshToken.getUserId(), Instant.now(), "REUSE_DETECTED");
            throw new InvalidTokenException("Invalid refresh token. Token family revoked due to reuse detection.");
        }

        if (refreshToken.isExpired()) {
            auditService.logSecurityEvent("REFRESH_TOKEN_EXPIRED", refreshToken.getUserId(), null, ipAddress, userAgent,
                    "Expired refresh token submitted", 20, refreshToken.getSessionId());
            throw new InvalidTokenException("Refresh token has expired. Please log in again.");
        }

        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new InvalidTokenException("User account not found"));

        if (user.getStatus() == UserStatus.SUSPENDED || user.getStatus() == UserStatus.DELETED) {
            throw new InvalidTokenException("User account is inactive");
        }

        // Token Rotation: mark current token as rotated
        refreshToken.setRevokedAt(Instant.now());
        refreshToken.setRevocationReason("ROTATED");
        refreshToken.setLastUsedAt(Instant.now());
        refreshTokenRepository.save(refreshToken);

        String newRawRefreshToken = tokenHashService.generateSecureToken();
        String newHashedRefreshToken = tokenHashService.hashToken(newRawRefreshToken);

        String deviceLabel = DeviceUtils.parseDeviceLabel(userAgent, refreshToken.getDeviceInfo());

        // New token inherits the session_id
        RefreshToken newRefreshToken = RefreshToken.builder()
                .sessionId(refreshToken.getSessionId())
                .userId(user.getId())
                .tokenHash(newHashedRefreshToken)
                .deviceInfo(deviceLabel)
                .userAgent(userAgent != null ? userAgent : refreshToken.getUserAgent())
                .ipAddress(ipAddress != null ? ipAddress : refreshToken.getIpAddress())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .lastUsedAt(Instant.now())
                .build();
        refreshTokenRepository.save(newRefreshToken);

        String newAccessToken = jwtTokenProvider.generateAccessToken(user);

        AuthResponse authResponse = AuthResponse.of(
                newAccessToken,
                jwtTokenProvider.getExpiresInSeconds(),
                UserProfileResponse.from(user)
        );

        return new AuthResult(authResponse, newRawRefreshToken);
    }

    public AuthResult refresh(String rawRefreshToken) {
        return refresh(rawRefreshToken, "127.0.0.1", "UNKNOWN");
    }

    @Transactional
    public void logout(String rawRefreshToken, String ipAddress, String userAgent) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String hashedToken = tokenHashService.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(hashedToken).ifPresent(token -> {
                if (!token.isRevoked()) {
                    token.setRevokedAt(Instant.now());
                    token.setRevocationReason("LOGOUT");
                    refreshTokenRepository.save(token);
                    auditService.logSecurityEvent("LOGOUT_SUCCESS", token.getUserId(), null, ipAddress, userAgent, "User logged out single session", 0, token.getSessionId());
                }
            });
        }
    }

    public void logout(String rawRefreshToken) {
        logout(rawRefreshToken, "127.0.0.1", "UNKNOWN");
    }

    /**
     * Terminate ALL active sessions and refresh-token families for the authenticated user.
     */
    @Transactional
    public MessageResponse logoutAll(UUID userId, String ipAddress, String userAgent) {
        int count = refreshTokenRepository.revokeAllActiveTokensForUserWithReason(userId, Instant.now(), "LOGOUT_ALL");
        auditService.logSecurityEvent("LOGOUT_ALL", userId, null, ipAddress, userAgent, "Revoked " + count + " active session(s)", 10);
        return new MessageResponse("Successfully logged out of all active sessions (" + count + " revoked)");
    }

    /**
     * Retrieve all active sessions for the authenticated user.
     */
    @Transactional(readOnly = true)
    public List<ActiveSessionResponse> getActiveSessions(UUID userId, String currentRawRefreshToken) {
        List<RefreshToken> activeTokens = refreshTokenRepository.findActiveTokensByUserId(userId, Instant.now());

        String currentHashedToken = (currentRawRefreshToken != null && !currentRawRefreshToken.isBlank())
                ? tokenHashService.hashToken(currentRawRefreshToken)
                : null;

        // Group by sessionId to return one entry per active session
        Map<UUID, ActiveSessionResponse> sessionMap = new LinkedHashMap<>();

        for (RefreshToken rt : activeTokens) {
            UUID sessionId = rt.getSessionId();
            if (!sessionMap.containsKey(sessionId)) {
                boolean isCurrent = currentHashedToken != null && currentHashedToken.equals(rt.getTokenHash());
                String maskedIp = PrivacyUtils.maskIpAddress(rt.getIpAddress());
                String deviceLabel = DeviceUtils.parseDeviceLabel(rt.getUserAgent(), rt.getDeviceInfo());
                Instant lastUsed = rt.getLastUsedAt() != null ? rt.getLastUsedAt() : rt.getCreatedAt();

                sessionMap.put(sessionId, new ActiveSessionResponse(
                        sessionId,
                        deviceLabel,
                        maskedIp,
                        rt.getCreatedAt(),
                        lastUsed,
                        isCurrent
                ));
            }
        }

        return new ArrayList<>(sessionMap.values());
    }

    /**
     * Revoke a specific active session belonging to the authenticated user.
     */
    @Transactional
    public MessageResponse revokeSession(UUID userId, UUID sessionId, String ipAddress, String userAgent) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndSessionId(userId, sessionId);
        if (tokens.isEmpty()) {
            throw new ResourceNotFoundException("Session not found with id: " + sessionId);
        }

        int count = refreshTokenRepository.revokeSessionForUser(userId, sessionId, Instant.now(), "USER_REVOKED");
        auditService.logSecurityEvent("SESSION_REVOKED", userId, null, ipAddress, userAgent, "Session explicitly revoked by user", 10, sessionId);

        return new MessageResponse("Session revoked successfully (" + count + " token(s) invalidated)");
    }

    /**
     * Retrieve security events history for the authenticated user.
     */
    @Transactional(readOnly = true)
    public List<SecurityEventResponse> getUserSecurityHistory(UUID userId) {
        return auditService.getUserSecurityEvents(userId, 20);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return UserProfileResponse.from(user);
    }

    @Transactional
    public MessageResponse verifyEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidTokenException("Token is required");
        }
        String hashedToken = tokenHashService.hashToken(rawToken);
        EmailVerificationToken token = emailVerificationTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired email verification token"));

        if (token.isVerified() || token.isExpired()) {
            throw new InvalidTokenException("Invalid or expired email verification token");
        }

        token.setVerifiedAt(Instant.now());
        emailVerificationTokenRepository.save(token);

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for token"));
        user.setEmailVerified(true);
        if (user.getStatus() == UserStatus.PENDING) {
            user.setStatus(UserStatus.ACTIVE);
        }
        userRepository.save(user);

        auditService.logSecurityEvent("EMAIL_VERIFIED", user.getId(), user.getEmail(), "UNKNOWN", "UNKNOWN", null, 0);

        return new MessageResponse("Email verified successfully");
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request, String ipAddress, String userAgent) {
        String normalizedEmail = request.email().toLowerCase().trim();
        userRepository.findByEmail(normalizedEmail).ifPresent(user -> {
            String rawToken = tokenHashService.generateSecureToken();
            String hashedToken = tokenHashService.hashToken(rawToken);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .userId(user.getId())
                    .tokenHash(hashedToken)
                    .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                    .build();
            passwordResetTokenRepository.save(resetToken);

            try {
                notificationPort.sendPasswordReset(user.getEmail(), rawToken);
            } catch (Exception e) {
                log.warn("Failed to dispatch password reset email: {}", e.getMessage());
            }

            auditService.logSecurityEvent("PASSWORD_RESET_REQUESTED", user.getId(), user.getEmail(), ipAddress, userAgent, "Reset token generated", 15);
        });

        return new MessageResponse("If an account exists for this email, password reset instructions have been sent.");
    }

    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        return forgotPassword(request, "127.0.0.1", "UNKNOWN");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request, String ipAddress, String userAgent) {
        String hashedToken = tokenHashService.hashToken(request.token());
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired password reset token"));

        if (token.isUsed() || token.isExpired()) {
            throw new InvalidTokenException("Invalid or expired password reset token");
        }

        token.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(token);

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for token"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Terminate all existing sessions on password reset
        refreshTokenRepository.revokeAllActiveTokensForUserWithReason(user.getId(), Instant.now(), "PASSWORD_RESET");

        auditService.logSecurityEvent("PASSWORD_RESET_SUCCESS", user.getId(), user.getEmail(), ipAddress, userAgent, "Password reset completed via token", 10);

        return new MessageResponse("Password has been reset successfully. Please log in with your new password.");
    }

    public MessageResponse resetPassword(ResetPasswordRequest request) {
        return resetPassword(request, "127.0.0.1", "UNKNOWN");
    }

    @Transactional
    public MessageResponse changePassword(UUID userId, ChangePasswordRequest request, String ipAddress, String userAgent) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Enforce verified email requirement for sensitive account changes
        if (!user.isEmailVerified()) {
            auditService.logSecurityEvent("PASSWORD_CHANGE_BLOCKED_UNVERIFIED", userId, user.getEmail(), ipAddress, userAgent, "Email verification required", 30);
            throw new EmailNotVerifiedException("Email verification is required to change password. Please verify your email first.");
        }

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            auditService.logSecurityEvent("PASSWORD_CHANGE_FAILED", userId, user.getEmail(), ipAddress, userAgent, "Current password incorrect", 20);
            throw new InvalidTokenException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        auditService.logSecurityEvent("PASSWORD_CHANGED", userId, user.getEmail(), ipAddress, userAgent, "Password changed by authenticated user", 5);

        return new MessageResponse("Password changed successfully");
    }

    public MessageResponse changePassword(UUID userId, ChangePasswordRequest request) {
        return changePassword(userId, request, "127.0.0.1", "UNKNOWN");
    }
}
