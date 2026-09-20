package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.exception.AccountLockedException;
import com.ahmed.identityservice.exception.EmailAlreadyExistsException;
import com.ahmed.identityservice.exception.InvalidTokenException;
import com.ahmed.identityservice.exception.ResourceNotFoundException;
import com.ahmed.identityservice.model.*;
import com.ahmed.identityservice.notification.NotificationPort;
import com.ahmed.identityservice.repository.*;
import com.ahmed.identityservice.security.JwtTokenProvider;
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
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

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

    @Transactional
    public AuthResult register(RegisterRequest request) {
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

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hashedRefreshToken)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
        refreshTokenRepository.save(refreshToken);

        AuthResponse authResponse = AuthResponse.of(
                accessToken,
                jwtTokenProvider.getExpiresInSeconds(),
                UserProfileResponse.from(user)
        );

        return new AuthResult(authResponse, rawRefreshToken);
    }

    @Transactional(noRollbackFor = {BadCredentialsException.class, AccountLockedException.class})
    public AuthResult login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        // Check account lock
        if (user.getLockedUntil() != null) {
            if (user.getLockedUntil().isAfter(Instant.now())) {
                throw new AccountLockedException("Account is temporarily locked due to too many failed attempts. Please try again later.");
            } else {
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
            }
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
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
                throw new AccountLockedException("Account locked for 15 minutes due to 5 consecutive failed login attempts.");
            }
            userRepository.save(user);
            throw new BadCredentialsException("Invalid email or password");
        }

        // Reset failed login counter and set last login timestamp
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String rawRefreshToken = tokenHashService.generateSecureToken();
        String hashedRefreshToken = tokenHashService.hashToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hashedRefreshToken)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
        refreshTokenRepository.save(refreshToken);

        AuthResponse authResponse = AuthResponse.of(
                accessToken,
                jwtTokenProvider.getExpiresInSeconds(),
                UserProfileResponse.from(user)
        );

        return new AuthResult(authResponse, rawRefreshToken);
    }

    @Transactional(noRollbackFor = {InvalidTokenException.class})
    public AuthResult refresh(String rawRefreshToken) {
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
            refreshTokenRepository.revokeAllActiveTokensForUser(refreshToken.getUserId(), Instant.now());
            throw new InvalidTokenException("Invalid refresh token. Token family revoked due to reuse detection.");
        }

        if (refreshToken.isExpired()) {
            throw new InvalidTokenException("Refresh token has expired. Please log in again.");
        }

        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new InvalidTokenException("User account not found"));

        if (user.getStatus() == UserStatus.SUSPENDED || user.getStatus() == UserStatus.DELETED) {
            throw new InvalidTokenException("User account is inactive");
        }

        // Token Rotation: revoke current token
        refreshToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(refreshToken);

        String newRawRefreshToken = tokenHashService.generateSecureToken();
        String newHashedRefreshToken = tokenHashService.hashToken(newRawRefreshToken);

        RefreshToken newRefreshToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(newHashedRefreshToken)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
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

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String hashedToken = tokenHashService.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(hashedToken).ifPresent(token -> {
                if (!token.isRevoked()) {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                }
            });
        }
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

        return new MessageResponse("Email verified successfully");
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        // Generic response returned always to prevent user enumeration
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
        });

        return new MessageResponse("If an account exists for this email, password reset instructions have been sent.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
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
        refreshTokenRepository.revokeAllActiveTokensForUser(user.getId(), Instant.now());

        return new MessageResponse("Password has been reset successfully. Please log in with your new password.");
    }

    @Transactional
    public MessageResponse changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new InvalidTokenException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        return new MessageResponse("Password changed successfully");
    }
}
