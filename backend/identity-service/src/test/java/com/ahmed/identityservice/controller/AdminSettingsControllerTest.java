package com.ahmed.identityservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class AdminSettingsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private final UUID adminUserId = UUID.randomUUID();
    private final UUID supportUserId = UUID.randomUUID();
    private final UUID userUserId = UUID.randomUUID();

    @Test
    @DisplayName("GET /admin/settings is permitted for ROLE_ADMIN")
    void getSettingsPermittedForAdmin() throws Exception {
        mockMvc.perform(get("/admin/settings")
                        .with(jwt().jwt(j -> j.subject(adminUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /admin/settings is permitted for ROLE_SUPPORT")
    void getSettingsPermittedForSupport() throws Exception {
        mockMvc.perform(get("/admin/settings")
                        .with(jwt().jwt(j -> j.subject(supportUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_SUPPORT"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /admin/settings is forbidden for ROLE_USER")
    void getSettingsForbiddenForUser() throws Exception {
        mockMvc.perform(get("/admin/settings")
                        .with(jwt().jwt(j -> j.subject(userUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /admin/settings is forbidden for ROLE_SUPPORT")
    void putSettingsForbiddenForSupport() throws Exception {
        Map<String, Object> body = Map.of("settings", Map.of("maintenance_mode", "false"));
        mockMvc.perform(put("/admin/settings")
                        .with(jwt().jwt(j -> j.subject(supportUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_SUPPORT")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /admin/settings validates invalid numeric range with 400 Bad Request")
    void putSettingsValidatesRange() throws Exception {
        Map<String, Object> body = Map.of("settings", Map.of("booking_auto_expiry_minutes", "2"));
        mockMvc.perform(put("/admin/settings")
                        .with(jwt().jwt(j -> j.subject(adminUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /admin/settings validates invalid email with 400 Bad Request")
    void putSettingsValidatesEmail() throws Exception {
        Map<String, Object> body = Map.of("settings", Map.of("support_email", "not-an-email"));
        mockMvc.perform(put("/admin/settings")
                        .with(jwt().jwt(j -> j.subject(adminUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }
}
