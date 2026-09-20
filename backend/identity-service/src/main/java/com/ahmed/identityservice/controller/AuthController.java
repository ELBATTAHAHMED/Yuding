package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.security.JwtTokenProvider;
import com.ahmed.identityservice.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
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

import java.util.List;
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

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

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
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        AuthResult result = authService.register(request, clientIp, userAgent);
        ResponseCookie cookie = buildRefreshTokenCookie(result.rawRefreshToken(), 7 * 24 * 60 * 60);

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        AuthResult result = authService.login(request, clientIp, userAgent);
        ResponseCookie cookie = buildRefreshTokenCookie(result.rawRefreshToken(), 7 * 24 * 60 * 60);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            @CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerRefreshToken,
            HttpServletRequest httpRequest) {

        String token = cookieRefreshToken != null ? cookieRefreshToken : headerRefreshToken;
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        authService.logout(token, clientIp, userAgent);
        ResponseCookie cookie = buildDeleteCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new MessageResponse("Logged out successfully"));
    }

    @PostMapping("/logout-all")
    public ResponseEntity<MessageResponse> logoutAll(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest httpRequest) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        MessageResponse response = authService.logoutAll(userId, clientIp, userAgent);
        ResponseCookie cookie = buildDeleteCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ActiveSessionResponse>> getActiveSessions(
            @AuthenticationPrincipal Jwt jwt,
            @CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerRefreshToken) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String token = cookieRefreshToken != null ? cookieRefreshToken : headerRefreshToken;
        List<ActiveSessionResponse> sessions = authService.getActiveSessions(userId, token);
        return ResponseEntity.ok(sessions);
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<MessageResponse> revokeSession(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID sessionId,
            HttpServletRequest httpRequest) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        MessageResponse response = authService.revokeSession(userId, sessionId, clientIp, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sessions/{sessionId}/revoke")
    public ResponseEntity<MessageResponse> revokeSessionPost(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID sessionId,
            HttpServletRequest httpRequest) {
        return revokeSession(jwt, sessionId, httpRequest);
    }

    @GetMapping("/security-events")
    public ResponseEntity<List<SecurityEventResponse>> getSecurityEvents(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        List<SecurityEventResponse> events = authService.getUserSecurityHistory(userId);
        return ResponseEntity.ok(events);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerRefreshToken,
            HttpServletRequest httpRequest) {

        String token = cookieRefreshToken != null ? cookieRefreshToken : headerRefreshToken;
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        AuthResult result = authService.refresh(token, clientIp, userAgent);
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
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        MessageResponse response = authService.forgotPassword(request, clientIp, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        MessageResponse response = authService.resetPassword(request, clientIp, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        MessageResponse response = authService.changePassword(userId, request, clientIp, userAgent);
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
