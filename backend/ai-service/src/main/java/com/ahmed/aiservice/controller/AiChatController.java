package com.ahmed.aiservice.controller;

import com.ahmed.aiservice.config.SecurityUtils;
import com.ahmed.aiservice.domain.service.AiChatService;
import com.ahmed.aiservice.domain.service.AiConversationService;
import com.ahmed.aiservice.domain.tool.AiToolExecutionContext;
import com.ahmed.aiservice.dto.*;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * REST controller for Yuding V2 AI Assistant & Durable Conversations.
 * Exposes canonical /api/ai/** and alias /ai/** endpoints.
 */
@RestController
@RequestMapping
public class AiChatController {

    private static final Logger log = LoggerFactory.getLogger(AiChatController.class);

    private final AiChatService aiChatService;
    private final AiConversationService aiConversationService;

    public AiChatController(AiChatService aiChatService,
                            @org.springframework.beans.factory.annotation.Autowired(required = false) AiConversationService aiConversationService) {
        this.aiChatService = aiChatService;
        this.aiConversationService = aiConversationService;
    }

    @PostMapping(
            value = {"/api/ai/conversations", "/ai/conversations"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<CreateConversationResponse> createConversation(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) Map<String, String> body) {

        UUID userId = resolveUserUuid(jwt);
        String title = (body != null) ? body.get("title") : null;

        if (aiConversationService == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI conversation service not available");
        }

        CreateConversationResponse response = aiConversationService.createConversation(userId, title);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping(
            value = {"/api/ai/conversations", "/ai/conversations"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<ConversationSummaryDto>> getConversations(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {

        UUID userId = resolveUserUuid(jwt);

        if (aiConversationService == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<ConversationSummaryDto> list = aiConversationService.getConversations(userId, limit);
        return ResponseEntity.ok(list);
    }

    @GetMapping(
            value = {"/api/ai/conversations/{id}/messages", "/ai/conversations/{id}/messages"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<ConversationMessageDto>> getConversationMessages(
            @PathVariable("id") UUID conversationId,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);

        if (aiConversationService == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable");
        }

        List<ConversationMessageDto> messages = aiConversationService.getConversationMessages(conversationId, userId);
        return ResponseEntity.ok(messages);
    }

    @PostMapping(
            value = {"/api/ai/chat", "/ai/chat"},
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<AiChatResponse> chat(
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        log.info("Received AI chat request: conversationId={}, messageLength={}",
                request.getConversationId(),
                request.getMessage() != null ? request.getMessage().length() : 0);

        String token = jwt != null ? jwt.getTokenValue() : null;
        String userId = jwt != null ? jwt.getSubject() : null;
        Set<String> roles = jwt != null && jwt.hasClaim("roles")
                ? new HashSet<>(jwt.getClaimAsStringList("roles"))
                : SecurityUtils.getCurrentUserRoles();

        AiToolExecutionContext executionContext = new AiToolExecutionContext(token, userId, roles);
        AiChatResponse response = aiChatService.processChat(request, executionContext);

        log.info("Completed AI chat response: conversationId={}, messageId={}, grounded={}, toolsUsed={}, responseLength={}",
                response.getConversationId(),
                response.getMessageId(),
                response.isGrounded(),
                response.getToolsUsed(),
                response.getContent() != null ? response.getContent().length() : 0);

        return ResponseEntity.ok(response);
    }

    private UUID resolveUserUuid(Jwt jwt) {
        UUID userId = SecurityUtils.extractUuid(jwt);
        if (userId == null) {
            userId = SecurityUtils.getCurrentUserUuid();
        }
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User authentication required");
        }
        return userId;
    }
}
