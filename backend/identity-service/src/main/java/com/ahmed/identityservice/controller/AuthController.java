package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.security.JwtTokenProvider;
import com.ahmed.identityservice.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    private ResponseCookie buildRefreshTokenCookie(String token, long maxAgeSeconds) {
        return ResponseCookie.from("refresh_token", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite("Strict")
                .maxAge(maxAgeSeconds)
                .build();
    }

    private ResponseCookie buildDeleteCookie() {
        return ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite("Strict")
                .maxAge(0)
                .build();
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResult result = authService.register(request);
        ResponseCookie cookie = buildRefreshTokenCookie(result.rawRefreshToken(), 7 * 24 * 60 * 60);

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResult result = authService.login(request);
        ResponseCookie cookie = buildRefreshTokenCookie(result.rawRefreshToken(), 7 * 24 * 60 * 60);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            @CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerRefreshToken) {

        String token = cookieRefreshToken != null ? cookieRefreshToken : headerRefreshToken;
        authService.logout(token);
        ResponseCookie cookie = buildDeleteCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new MessageResponse("Logged out successfully"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerRefreshToken) {

        String token = cookieRefreshToken != null ? cookieRefreshToken : headerRefreshToken;
        AuthResult result = authService.refresh(token);
        ResponseCookie cookie = buildRefreshTokenCookie(result.rawRefreshToken(), 7 * 24 * 60 * 60);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UserProfileResponse profile = authService.getProfile(userId);
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        MessageResponse response = authService.verifyEmail(request.token());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        MessageResponse response = authService.forgotPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        MessageResponse response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        MessageResponse response = authService.changePassword(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/jwks")
    public ResponseEntity<Map<String, Object>> getJwks() {
        return ResponseEntity.ok(jwtTokenProvider.getJwkSet());
    }

    @GetMapping(value = "/public-key", produces = "text/plain")
    public ResponseEntity<String> getPublicKey() {
        return ResponseEntity.ok(jwtTokenProvider.getPublicKeyPem());
    }
}
