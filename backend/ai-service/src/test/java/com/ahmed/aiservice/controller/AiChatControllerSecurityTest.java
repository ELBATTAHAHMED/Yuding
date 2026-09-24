package com.ahmed.aiservice.controller;

import com.ahmed.aiservice.domain.service.AiChatService;
import com.ahmed.aiservice.dto.AiChatRequest;
import com.ahmed.aiservice.dto.AiChatResponse;
import com.ahmed.aiservice.exception.AiProviderException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:postgresql://localhost:5433/yuding?currentSchema=ai",
        "spring.sql.init.mode=never"
})
class AiChatControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AiChatService aiChatService;

    @MockitoBean
    private com.ahmed.aiservice.domain.service.AiConversationService aiConversationService;

    @Test
    @DisplayName("Anonymous access to POST /api/ai/chat is rejected with 401 Unauthorized")
    void anonymousAccess_apiAiChat_rejectedWith401() throws Exception {
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(UUID.randomUUID())
                .message("Bonjour")
                .build();

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Anonymous access to POST /ai/chat is rejected with 401 Unauthorized")
    void anonymousAccess_aiChat_rejectedWith401() throws Exception {
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(UUID.randomUUID())
                .message("Bonjour")
                .build();

        mockMvc.perform(post("/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Authenticated user with valid JWT can call POST /api/ai/chat successfully")
    void authenticatedUser_apiAiChat_success() throws Exception {
        UUID conversationId = UUID.randomUUID();
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(conversationId)
                .message("Idées d'escapade pour ce week-end ?")
                .build();

        AiChatResponse response = AiChatResponse.of(
                conversationId,
                "Voici trois idées d'escapades : Annecy, Saint-Malo ou la Provence !"
        );

        when(aiChatService.processChat(any(AiChatRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/ai/chat")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("user-123").claim("roles", "ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conversationId").value(conversationId.toString()))
                .andExpect(jsonPath("$.role").value("assistant"))
                .andExpect(jsonPath("$.content").value("Voici trois idées d'escapades : Annecy, Saint-Malo ou la Provence !"))
                .andExpect(jsonPath("$.messageId").isNotEmpty())
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    @DisplayName("Authenticated user with invalid request (blank message) receives 400 Bad Request")
    void authenticatedUser_invalidPayload_returns400() throws Exception {
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(UUID.randomUUID())
                .message("   ")
                .build();

        mockMvc.perform(post("/api/ai/chat")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("user-123").claim("roles", "ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors").isArray());
    }

    @Test
    @DisplayName("Provider transient failure returns 503 Service Unavailable")
    void providerTransientError_returns503() throws Exception {
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(UUID.randomUUID())
                .message("Des hôtels à Nice ?")
                .build();

        when(aiChatService.processChat(any(AiChatRequest.class), any())).thenThrow(
                new AiProviderException("All providers exhausted", "PROVIDER_UNAVAILABLE", true, HttpStatus.SERVICE_UNAVAILABLE)
        );

        mockMvc.perform(post("/api/ai/chat")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("user-123").claim("roles", "ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503));
    }

    @Test
    @DisplayName("Anonymous access to POST /api/ai/conversations is rejected with 401 Unauthorized")
    void anonymousAccess_createConversation_rejectedWith401() throws Exception {
        mockMvc.perform(post("/api/ai/conversations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Anonymous access to GET /api/ai/conversations is rejected with 401 Unauthorized")
    void anonymousAccess_getConversations_rejectedWith401() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/ai/conversations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Authenticated user can create a conversation successfully (201 Created)")
    void authenticatedUser_createConversation_success() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID convId = UUID.randomUUID();

        when(aiConversationService.createConversation(eq(userId), any())).thenReturn(
                new com.ahmed.aiservice.dto.CreateConversationResponse(
                        convId, "Nouveau voyage", java.time.Instant.now(), java.time.Instant.now(), null
                )
        );

        mockMvc.perform(post("/api/ai/conversations")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()).claim("roles", "ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Nouveau voyage\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(convId.toString()))
                .andExpect(jsonPath("$.title").value("Nouveau voyage"));
    }

    @Test
    @DisplayName("IDOR Protection: Access to another user's conversation messages returns 404 Not Found")
    void idorProtection_otherUserConversation_returns404() throws Exception {
        UUID attackerId = UUID.randomUUID();
        UUID victimConvId = UUID.randomUUID();

        when(aiConversationService.getConversationMessages(eq(victimConvId), eq(attackerId)))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/ai/conversations/" + victimConvId + "/messages")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(attackerId.toString()).claim("roles", "ROLE_USER"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void anonymousCannotDeleteConversation() throws Exception {
        mockMvc.perform(delete("/api/ai/conversations/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ownerCanDeleteConversation() throws Exception {
        UUID owner = UUID.randomUUID(), conversationId = UUID.randomUUID();
        mockMvc.perform(delete("/api/ai/conversations/" + conversationId)
                        .with(jwt().jwt(j -> j.subject(owner.toString()))))
                .andExpect(status().isNoContent());
        verify(aiConversationService).deleteConversation(conversationId, owner);
    }

    @Test
    void crossAccountDeletionReturns404() throws Exception {
        UUID attacker = UUID.randomUUID(), conversationId = UUID.randomUUID();
        doThrow(new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable"))
                .when(aiConversationService).deleteConversation(conversationId, attacker);
        mockMvc.perform(delete("/api/ai/conversations/" + conversationId)
                        .with(jwt().jwt(j -> j.subject(attacker.toString()))))
                .andExpect(status().isNotFound());
    }
}
