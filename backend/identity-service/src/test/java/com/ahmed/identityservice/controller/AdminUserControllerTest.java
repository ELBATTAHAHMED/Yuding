package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.AdminUserSummaryResponse;
import com.ahmed.identityservice.dto.MessageResponse;
import com.ahmed.identityservice.dto.UpdateUserRolesRequest;
import com.ahmed.identityservice.model.UserStatus;
import com.ahmed.identityservice.service.AdminUserService;
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
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminUserService adminUserService;

    private final UUID targetUserId = UUID.randomUUID();
    private final UUID adminUserId = UUID.randomUUID();
    private final UUID supportUserId = UUID.randomUUID();
    private final UUID normalUserId = UUID.randomUUID();

    private AdminUserSummaryResponse sampleUser() {
        return new AdminUserSummaryResponse(
                targetUserId, "target@example.com", "Target", "User",
                "+1234567890", "US", UserStatus.ACTIVE, true, 0,
                null, Instant.now(), Set.of("ROLE_USER"),
                Instant.now(), Instant.now()
        );
    }

    @Test
    @DisplayName("Anonymous request to /admin/users is rejected with 401 Unauthorized")
    void anonymousAccess_rejectedWith401() throws Exception {
        mockMvc.perform(get("/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ROLE_USER request to /admin/users is rejected with 403 Forbidden")
    void normalUserAccess_rejectedWith403() throws Exception {
        mockMvc.perform(get("/admin/users")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(normalUserId.toString()))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_SUPPORT can view users on /admin/users (200 OK)")
    void supportUser_canViewUsers() throws Exception {
        when(adminUserService.getAllUsers()).thenReturn(List.of(sampleUser()));

        mockMvc.perform(get("/admin/users")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_SUPPORT"))
                                .jwt(j -> j.subject(supportUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("target@example.com"));
    }

    @Test
    @DisplayName("ROLE_SUPPORT cannot modify user roles (403 Forbidden)")
    void supportUser_cannotModifyRoles() throws Exception {
        UpdateUserRolesRequest req = new UpdateUserRolesRequest(Set.of("ROLE_ADMIN"));

        mockMvc.perform(put("/admin/users/" + targetUserId + "/roles")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_SUPPORT"))
                                .jwt(j -> j.subject(supportUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_ADMIN can modify user roles (200 OK)")
    void adminUser_canModifyRoles() throws Exception {
        UpdateUserRolesRequest req = new UpdateUserRolesRequest(Set.of("ROLE_ADMIN"));
        AdminUserSummaryResponse updated = new AdminUserSummaryResponse(
                targetUserId, "target@example.com", "Target", "User",
                "+1234567890", "US", UserStatus.ACTIVE, true, 0,
                null, Instant.now(), Set.of("ROLE_USER", "ROLE_ADMIN"),
                Instant.now(), Instant.now()
        );
        when(adminUserService.updateUserRoles(eq(adminUserId), eq(targetUserId), any())).thenReturn(updated);

        mockMvc.perform(put("/admin/users/" + targetUserId + "/roles")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))
                                .jwt(j -> j.subject(adminUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles").isArray());
    }

    @Test
    @DisplayName("ROLE_ADMIN can unlock a locked account (200 OK)")
    void adminUser_canUnlockAccount() throws Exception {
        when(adminUserService.unlockUser(eq(adminUserId), eq(targetUserId)))
                .thenReturn(new MessageResponse("Account unlocked successfully"));

        mockMvc.perform(post("/admin/users/" + targetUserId + "/unlock")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))
                                .jwt(j -> j.subject(adminUserId.toString()))))
                .andExpect(status().isOk());
    }
}
