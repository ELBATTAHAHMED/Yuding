package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.ActiveSessionResponse;
import com.ahmed.identityservice.dto.ChangePasswordRequest;
import com.ahmed.identityservice.dto.MessageResponse;
import com.ahmed.identityservice.dto.SecurityEventResponse;
import com.ahmed.identityservice.exception.EmailNotVerifiedException;
import com.ahmed.identityservice.exception.ResourceNotFoundException;
import com.ahmed.identityservice.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class AccountSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    private final UUID currentUserId = UUID.randomUUID();
    private final UUID sampleSessionId = UUID.randomUUID();

    @Test
    @DisplayName("Anonymous access to session and security endpoints is rejected with 401 Unauthorized")
    void anonymousAccess_rejectedWith401() throws Exception {
        mockMvc.perform(post("/auth/logout-all"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/auth/sessions"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/auth/sessions/" + sampleSessionId))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/auth/security-events"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"OldPass123!\",\"newPassword\":\"NewPass123!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /auth/logout-all revokes all sessions and returns 200 OK with cleared cookie")
    void logoutAll_authenticatedUser_success() throws Exception {
        when(authService.logoutAll(eq(currentUserId), any(), any()))
                .thenReturn(new MessageResponse("All active sessions have been revoked successfully"));

        mockMvc.perform(post("/auth/logout-all")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("All active sessions have been revoked successfully"))
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    @DisplayName("GET /auth/sessions returns active sessions with masked IP and device label without exposing raw tokens")
    void getActiveSessions_authenticatedUser_returnsSafeMetadata() throws Exception {
        ActiveSessionResponse session1 = new ActiveSessionResponse(
                sampleSessionId,
                "Chrome on Windows",
                "192.168.1.***",
                Instant.now(),
                Instant.now(),
                true
        );
        ActiveSessionResponse session2 = new ActiveSessionResponse(
                UUID.randomUUID(),
                "Mobile Safari on iPhone",
                "10.0.0.***",
                Instant.now().minusSeconds(3600),
                Instant.now().minusSeconds(1800),
                false
        );

        when(authService.getActiveSessions(eq(currentUserId), any()))
                .thenReturn(List.of(session1, session2));

        mockMvc.perform(get("/auth/sessions")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].sessionId").value(sampleSessionId.toString()))
                .andExpect(jsonPath("$[0].deviceLabel").value("Chrome on Windows"))
                .andExpect(jsonPath("$[0].ipAddressMasked").value("192.168.1.***"))
                .andExpect(jsonPath("$[0].isCurrent").value(true))
                .andExpect(jsonPath("$[0].token").doesNotExist())
                .andExpect(jsonPath("$[0].tokenHash").doesNotExist())
                .andExpect(jsonPath("$[1].deviceLabel").value("Mobile Safari on iPhone"))
                .andExpect(jsonPath("$[1].ipAddressMasked").value("10.0.0.***"))
                .andExpect(jsonPath("$[1].isCurrent").value(false));
    }

    @Test
    @DisplayName("DELETE /auth/sessions/{sessionId} revokes specific session for authenticated user")
    void revokeSession_authenticatedUser_success() throws Exception {
        when(authService.revokeSession(eq(currentUserId), eq(sampleSessionId), any(), any()))
                .thenReturn(new MessageResponse("Session revoked successfully"));

        mockMvc.perform(delete("/auth/sessions/" + sampleSessionId)
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session revoked successfully"));
    }

    @Test
    @DisplayName("POST /auth/sessions/{sessionId}/revoke alternative endpoint revokes specific session")
    void revokeSessionPost_authenticatedUser_success() throws Exception {
        when(authService.revokeSession(eq(currentUserId), eq(sampleSessionId), any(), any()))
                .thenReturn(new MessageResponse("Session revoked successfully"));

        mockMvc.perform(post("/auth/sessions/" + sampleSessionId + "/revoke")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session revoked successfully"));
    }

    @Test
    @DisplayName("DELETE /auth/sessions/{sessionId} for non-existent or other user's session returns 404 (IDOR prevention)")
    void revokeSession_unauthorizedOrNotFound_returns404() throws Exception {
        UUID foreignSessionId = UUID.randomUUID();
        when(authService.revokeSession(eq(currentUserId), eq(foreignSessionId), any(), any()))
                .thenThrow(new ResourceNotFoundException("Active session not found or does not belong to the user"));

        mockMvc.perform(delete("/auth/sessions/" + foreignSessionId)
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString()))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /auth/change-password is rejected with 403 Forbidden when email is not verified")
    void changePassword_unverifiedEmail_rejectedWith403() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest("CurrentSecret123!", "NewSecret456!");
        when(authService.changePassword(eq(currentUserId), any(ChangePasswordRequest.class), any(), any()))
                .thenThrow(new EmailNotVerifiedException("Email verification is required before changing password. Please verify your email address."));

        mockMvc.perform(post("/auth/change-password")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Email verification is required before changing password. Please verify your email address."));
    }

    @Test
    @DisplayName("POST /auth/change-password succeeds with 200 OK when email is verified")
    void changePassword_verifiedEmail_success() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest("CurrentSecret123!", "NewSecret456!");
        when(authService.changePassword(eq(currentUserId), any(ChangePasswordRequest.class), any(), any()))
                .thenReturn(new MessageResponse("Password changed successfully"));

        mockMvc.perform(post("/auth/change-password")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password changed successfully"));
    }

    @Test
    @DisplayName("GET /auth/security-events returns audit security history with masked IP")
    void getSecurityEvents_authenticatedUser_returnsEvents() throws Exception {
        SecurityEventResponse event1 = new SecurityEventResponse(
                101L,
                "LOGIN_SUCCESS",
                "192.168.1.***",
                "Chrome on Windows",
                null,
                0,
                Instant.now()
        );
        SecurityEventResponse event2 = new SecurityEventResponse(
                102L,
                "LOGIN_NEW_DEVICE",
                "192.168.1.***",
                "Chrome on Windows",
                null,
                10,
                Instant.now().minusSeconds(10)
        );

        when(authService.getUserSecurityHistory(eq(currentUserId)))
                .thenReturn(List.of(event1, event2));

        mockMvc.perform(get("/auth/security-events")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(currentUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].eventType").value("LOGIN_SUCCESS"))
                .andExpect(jsonPath("$[0].ipAddressMasked").value("192.168.1.***"))
                .andExpect(jsonPath("$[0].riskScore").value(0))
                .andExpect(jsonPath("$[1].eventType").value("LOGIN_NEW_DEVICE"))
                .andExpect(jsonPath("$[1].riskScore").value(10));
    }
}
