package com.ahmed.aiservice.controller;

import com.ahmed.aiservice.domain.service.AiChatService;
import com.ahmed.aiservice.dto.AiChatRequest;
import com.ahmed.aiservice.dto.AiChatResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for Yuding V2 AI Assistant.
 * Exposes canonical POST /api/ai/chat and alias /ai/chat.
 */
@RestController
@RequestMapping
public class AiChatController {

    private static final Logger log = LoggerFactory.getLogger(AiChatController.class);

    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @PostMapping(
            value = {"/api/ai/chat", "/ai/chat"},
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<AiChatResponse> chat(@Valid @RequestBody AiChatRequest request) {
        log.info("Received AI chat request: conversationId={}, messageLength={}",
                request.getConversationId(),
                request.getMessage() != null ? request.getMessage().length() : 0);

        AiChatResponse response = aiChatService.processChat(request);

        log.info("Completed AI chat response: conversationId={}, messageId={}, responseLength={}",
                response.getConversationId(),
                response.getMessageId(),
                response.getContent() != null ? response.getContent().length() : 0);

        return ResponseEntity.ok(response);
    }
}
