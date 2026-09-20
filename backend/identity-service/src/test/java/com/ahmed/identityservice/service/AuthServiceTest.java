package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.exception.AccountLockedException;
import com.ahmed.identityservice.exception.EmailAlreadyExistsException;
import com.ahmed.identityservice.exception.InvalidTokenException;
import com.ahmed.identityservice.model.*;
import com.ahmed.identityservice.notification.NotificationPort;
import com.ahmed.identityservice.repository.*;
import com.ahmed.identityservice.security.JwtTokenProvider;
import com.ahmed.identityservice.security.TokenHashService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private TokenHashService tokenHashService;
    @Mock
    private NotificationPort notificationPort;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private Role userRole;

    @BeforeEach
    void setUp() {
        userRole = Role.builder().id(1).name("ROLE_USER").build();
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("traveler@example.com")
                .passwordHash("hashed_password_123")
                .firstName("John")
                .lastName("Doe")
                .phoneNumber("+33612345678")
                .countryCode("FRA")
                .status(UserStatus.ACTIVE)
                .isEmailVerified(false)
                .failedLoginAttempts(0)
                .roles(new HashSet<>(Set.of(userRole)))
                .build();
    }

    @Test
    @DisplayName("Register: Successfully registers new user and issues tokens")
    void register_success() {
        RegisterRequest request = new RegisterRequest(
                "traveler@example.com",
                "SecureP@ss123",
                "John",
                "Doe",
                "+33612345678",
                "FRA"
        );

        when(userRepository.existsByEmail("traveler@example.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_USER")).thenReturn(Optional.of(userRole));
        when(passwordEncoder.encode(request.password())).thenReturn("bcrypt_hashed_password");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(tokenHashService.generateSecureToken()).thenReturn("raw_token_xyz");
        when(tokenHashService.hashToken("raw_token_xyz")).thenReturn("hashed_token_xyz");
        when(jwtTokenProvider.generateAccessToken(testUser)).thenReturn("jwt.access.token");
        when(jwtTokenProvider.getExpiresInSeconds()).thenReturn(900L);

        AuthResult result = authService.register(request);

        assertThat(result).isNotNull();
        assertThat(result.authResponse().accessToken()).isEqualTo("jwt.access.token");
        assertThat(result.authResponse().user().email()).isEqualTo("traveler@example.com");
        assertThat(result.rawRefreshToken()).isEqualTo("raw_token_xyz");

        verify(emailVerificationTokenRepository).save(any(EmailVerificationToken.class));
        verify(notificationPort).sendEmailVerification(eq("traveler@example.com"), eq("raw_token_xyz"));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Register: Throws EmailAlreadyExistsException (409) if duplicate email")
    void register_duplicateEmail_throwsConflict() {
        RegisterRequest request = new RegisterRequest(
                "traveler@example.com",
                "SecureP@ss123",
                "John",
                "Doe",
                null,
                null
        );

        when(userRepository.existsByEmail("traveler@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("Email is already registered");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Login: Successful login resets failed attempts and returns tokens")
    void login_success() {
        LoginRequest request = new LoginRequest("traveler@example.com", "SecureP@ss123");

        when(userRepository.findByEmail("traveler@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("SecureP@ss123", testUser.getPasswordHash())).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(testUser)).thenReturn("jwt.access.token");
        when(jwtTokenProvider.getExpiresInSeconds()).thenReturn(900L);
        when(tokenHashService.generateSecureToken()).thenReturn("refresh_token_abc");
        when(tokenHashService.hashToken("refresh_token_abc")).thenReturn("hashed_refresh_token_abc");

        AuthResult result = authService.login(request);

        assertThat(result).isNotNull();
        assertThat(result.authResponse().accessToken()).isEqualTo("jwt.access.token");
        assertThat(testUser.getFailedLoginAttempts()).isEqualTo(0);
        assertThat(testUser.getLastLoginAt()).isNotNull();

        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Login: Bad credentials increments failedLoginAttempts")
    void login_badCredentials_incrementsAttempts() {
        LoginRequest request = new LoginRequest("traveler@example.com", "WrongPassword");

        when(userRepository.findByEmail("traveler@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPassword", testUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");

        assertThat(testUser.getFailedLoginAttempts()).isEqualTo(1);
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Login: Account lockout triggers after 5 failed attempts")
    void login_lockoutAfterFiveFailedAttempts() {
        testUser.setFailedLoginAttempts(4);
        LoginRequest request = new LoginRequest("traveler@example.com", "WrongPassword");

        when(userRepository.findByEmail("traveler@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPassword", testUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AccountLockedException.class)
                .hasMessageContaining("Account locked for 15 minutes");

        assertThat(testUser.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(testUser.getLockedUntil()).isNotNull();
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Refresh: Rotates token successfully")
    void refresh_success_withRotation() {
        String oldRawToken = "old_raw_refresh_token";
        String oldHash = "old_hashed_token";
        String newRawToken = "new_raw_refresh_token";
        String newHash = "new_hashed_token";

        RefreshToken existingToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .userId(testUser.getId())
                .tokenHash(oldHash)
                .expiresAt(Instant.now().plus(5, ChronoUnit.DAYS))
                .build();

        when(tokenHashService.hashToken(oldRawToken)).thenReturn(oldHash);
        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(existingToken));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(tokenHashService.generateSecureToken()).thenReturn(newRawToken);
        when(tokenHashService.hashToken(newRawToken)).thenReturn(newHash);
        when(jwtTokenProvider.generateAccessToken(testUser)).thenReturn("new.jwt.access.token");
        when(jwtTokenProvider.getExpiresInSeconds()).thenReturn(900L);

        AuthResult result = authService.refresh(oldRawToken);

        assertThat(result).isNotNull();
        assertThat(result.authResponse().accessToken()).isEqualTo("new.jwt.access.token");
        assertThat(existingToken.isRevoked()).isTrue();
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Refresh: Reuse detection revokes all tokens for user on presenting revoked token")
    void refresh_reuseDetection_revokesAllTokens() {
        String reusedRawToken = "reused_raw_token";
        String reusedHash = "reused_token_hash";

        RefreshToken revokedToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .userId(testUser.getId())
                .tokenHash(reusedHash)
                .expiresAt(Instant.now().plus(5, ChronoUnit.DAYS))
                .revokedAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .build();

        when(tokenHashService.hashToken(reusedRawToken)).thenReturn(reusedHash);
        when(refreshTokenRepository.findByTokenHash(reusedHash)).thenReturn(Optional.of(revokedToken));

        assertThatThrownBy(() -> authService.refresh(reusedRawToken))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("Token family revoked due to reuse detection");

        verify(refreshTokenRepository).revokeAllActiveTokensForUserWithReason(eq(testUser.getId()), any(Instant.class), eq("REUSE_DETECTED"));
    }

    @Test
    @DisplayName("VerifyEmail: Marks email verified and activates user")
    void verifyEmail_success() {
        String rawToken = "raw_verification_token";
        String hashedToken = "hashed_verification_token";

        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .userId(testUser.getId())
                .tokenHash(hashedToken)
                .expiresAt(Instant.now().plus(12, ChronoUnit.HOURS))
                .build();

        when(tokenHashService.hashToken(rawToken)).thenReturn(hashedToken);
        when(emailVerificationTokenRepository.findByTokenHash(hashedToken)).thenReturn(Optional.of(token));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        MessageResponse response = authService.verifyEmail(rawToken);

        assertThat(response.message()).isEqualTo("Email verified successfully");
        assertThat(token.isVerified()).isTrue();
        assertThat(testUser.isEmailVerified()).isTrue();
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("ForgotPassword: Always returns generic message preventing user enumeration")
    void forgotPassword_returnsGenericMessage() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("unknown@example.com");

        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        MessageResponse response = authService.forgotPassword(request);

        assertThat(response.message()).contains("If an account exists for this email");
        verify(passwordResetTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("ResetPassword: Resets password and terminates active user sessions")
    void resetPassword_resetsPassword_andTerminatesSessions() {
        String rawToken = "raw_reset_token";
        String hashedToken = "hashed_reset_token";

        ResetPasswordRequest request = new ResetPasswordRequest(rawToken, "NewBrandPass99!");

        PasswordResetToken token = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .userId(testUser.getId())
                .tokenHash(hashedToken)
                .expiresAt(Instant.now().plus(30, ChronoUnit.MINUTES))
                .build();

        when(tokenHashService.hashToken(rawToken)).thenReturn(hashedToken);
        when(passwordResetTokenRepository.findByTokenHash(hashedToken)).thenReturn(Optional.of(token));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("NewBrandPass99!")).thenReturn("new_bcrypt_hash");

        MessageResponse response = authService.resetPassword(request);

        assertThat(response.message()).contains("Password has been reset successfully");
        assertThat(token.isUsed()).isTrue();
        assertThat(testUser.getPasswordHash()).isEqualTo("new_bcrypt_hash");

        verify(refreshTokenRepository).revokeAllActiveTokensForUserWithReason(eq(testUser.getId()), any(Instant.class), eq("PASSWORD_RESET"));
        verify(userRepository).save(testUser);
    }
}
