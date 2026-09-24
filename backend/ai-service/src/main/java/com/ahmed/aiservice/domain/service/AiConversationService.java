package com.ahmed.aiservice.domain.service;

import com.ahmed.aiservice.domain.entity.AiToolCallEntity;
import com.ahmed.aiservice.domain.entity.ConversationEntity;
import com.ahmed.aiservice.domain.entity.ConversationMessageEntity;
import com.ahmed.aiservice.domain.repository.AiToolCallRepository;
import com.ahmed.aiservice.domain.repository.ConversationMessageRepository;
import com.ahmed.aiservice.domain.repository.ConversationRepository;
import com.ahmed.aiservice.dto.ConversationMessageDto;
import com.ahmed.aiservice.dto.ConversationSummaryDto;
import com.ahmed.aiservice.dto.CreateConversationResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

import com.ahmed.aiservice.domain.attachment.dto.AiAttachmentDto;
import com.ahmed.aiservice.domain.attachment.repository.MessageAttachmentRepository;
import com.ahmed.aiservice.domain.rag.entity.MessageSourceEntity;
import com.ahmed.aiservice.domain.rag.repository.MessageSourceRepository;
import com.ahmed.aiservice.dto.AiSourceDto;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository conversationMessageRepository;
    private final AiToolCallRepository toolCallRepository;
    private final MessageSourceRepository messageSourceRepository;
    private final MessageAttachmentRepository messageAttachmentRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public CreateConversationResponse createConversation(UUID userId, String initialTitle) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User ID is required to create a conversation");
        }

        String title = (initialTitle != null && !initialTitle.isBlank())
                ? (initialTitle.length() > 255 ? initialTitle.substring(0, 255) : initialTitle)
                : "Nouvelle conversation";

        Instant now = Instant.now();
        ConversationEntity entity = ConversationEntity.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .title(title)
                .status("ACTIVE")
                .createdAt(now)
                .updatedAt(now)
                .lastMessageAt(null)
                .version(0)
                .build();

        ConversationEntity saved = conversationRepository.save(entity);
        log.info("Created new AI conversation: id={} for userId={}", saved.getId(), userId);

        return new CreateConversationResponse(
                saved.getId(),
                saved.getTitle(),
                saved.getCreatedAt(),
                saved.getUpdatedAt(),
                saved.getLastMessageAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ConversationSummaryDto> getConversations(UUID userId, int limit) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User ID is required");
        }

        int pageSize = Math.max(1, Math.min(limit, 50));
        List<ConversationEntity> list = conversationRepository.findByUserIdOrderByActivity(userId, PageRequest.of(0, pageSize));

        return list.stream()
                .map(c -> ConversationSummaryDto.builder()
                        .id(c.getId())
                        .title(c.getTitle())
                        .status(c.getStatus())
                        .createdAt(c.getCreatedAt())
                        .updatedAt(c.getUpdatedAt())
                        .lastMessageAt(c.getLastMessageAt())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationMessageDto> getConversationMessages(UUID conversationId, UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User ID is required");
        }
        if (conversationId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conversation ID is required");
        }

        // Strict IDOR verification: conversation must exist AND belong to current user
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable"));

        if (!conv.getUserId().equals(userId)) {
            log.warn("Security Alert: User {} attempted unauthorized access to conversation {} owned by {}",
                    userId, conversationId, conv.getUserId());
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable");
        }

        List<ConversationMessageEntity> messages =
                conversationMessageRepository.findByConversationIdOrderBySequenceNumberAscCreatedAtAsc(conversationId);

        List<ConversationMessageDto> dtos = new ArrayList<>();
        for (ConversationMessageEntity msg : messages) {
            List<String> toolsUsed = new ArrayList<>();
            if (Boolean.TRUE.equals(msg.getGrounded())) {
                List<AiToolCallEntity> toolCalls = toolCallRepository.findByAssistantMessageId(msg.getId());
                for (AiToolCallEntity tc : toolCalls) {
                    if ("SUCCESS".equalsIgnoreCase(tc.getStatus()) && !toolsUsed.contains(tc.getToolName())) {
                        toolsUsed.add(tc.getToolName());
                    }
                }
            }

            List<AiSourceDto> sources = new ArrayList<>();
            if (messageSourceRepository != null) {
                List<MessageSourceEntity> sourceEntities = messageSourceRepository.findByMessageId(msg.getId());
                for (MessageSourceEntity se : sourceEntities) {
                    sources.add(new AiSourceDto(se.getDocumentReference(), se.getTitle(), se.getSectionTitle(), se.getCategory()));
                }
            }

            String groundingType = "NONE";
            if (!sources.isEmpty() && toolsUsed.stream().anyMatch(t -> !t.equals("searchKnowledge"))) {
                groundingType = "MIXED";
            } else if (!sources.isEmpty()) {
                groundingType = "RAG";
            } else if (Boolean.TRUE.equals(msg.getGrounded())) {
                groundingType = "LIVE";
            }

            List<AiAttachmentDto> attachments = Collections.emptyList();
            if (messageAttachmentRepository != null) {
                attachments = messageAttachmentRepository.findByMessageIdWithAttachment(msg.getId()).stream()
                        .map(ma -> AiAttachmentDto.builder()
                                .id(ma.getAttachment().getId())
                                .publicReference(ma.getAttachment().getPublicReference())
                                .originalFilename(ma.getAttachment().getOriginalFilename())
                                .mimeType(ma.getAttachment().getMimeType())
                                .sizeBytes(ma.getAttachment().getSizeBytes())
                                .kind(ma.getAttachment().getKind())
                                .status(ma.getAttachment().getStatus())
                                .createdAt(ma.getAttachment().getCreatedAt())
                                .build())
                        .toList();
            }

            dtos.add(ConversationMessageDto.builder()
                    .id(msg.getId())
                    .conversationId(msg.getConversationId())
                    .role(msg.getRole() != null ? msg.getRole().toLowerCase() : "user")
                    .content(msg.getContent())
                    .grounded(Boolean.TRUE.equals(msg.getGrounded()))
                    .toolsUsed(toolsUsed)
                    .groundingType(groundingType)
                    .sources(sources)
                    .attachments(attachments)
                    .createdAt(msg.getCreatedAt())
                    .build());
        }

        return dtos;
    }

    @Transactional
    public ConversationEntity getOrCreateConversation(UUID conversationId, UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User ID is required");
        }

        if (conversationId != null) {
            Optional<ConversationEntity> existing = conversationRepository.findById(conversationId);
            if (existing.isPresent()) {
                ConversationEntity conv = existing.get();
                if (!conv.getUserId().equals(userId)) {
                    log.warn("Security Alert: User {} attempted to access conversation {} owned by {}",
                            userId, conversationId, conv.getUserId());
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable");
                }
                return conv;
            }

            // Create with requested conversationId
            Instant now = Instant.now();
            ConversationEntity newConv = ConversationEntity.builder()
                    .id(conversationId)
                    .userId(userId)
                    .title("Nouvelle conversation")
                    .status("ACTIVE")
                    .createdAt(now)
                    .updatedAt(now)
                    .lastMessageAt(null)
                    .version(0)
                    .build();
            return conversationRepository.save(newConv);
        }

        // Generate new conversationId
        Instant now = Instant.now();
        ConversationEntity newConv = ConversationEntity.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .title("Nouvelle conversation")
                .status("ACTIVE")
                .createdAt(now)
                .updatedAt(now)
                .lastMessageAt(null)
                .version(0)
                .build();
        return conversationRepository.save(newConv);
    }

    public String sanitizeJsonForStorage(Object obj) {
        if (obj == null) return null;
        try {
            JsonNode node = objectMapper.valueToTree(obj);
            sanitizeJsonNode(node);
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            log.warn("Failed to sanitize JSON for storage: {}", e.getMessage());
            return "{}";
        }
    }

    private void sanitizeJsonNode(JsonNode node) {
        if (node.isObject()) {
            ObjectNode objNode = (ObjectNode) node;
            List<String> keysToRemove = new ArrayList<>();
            objNode.fieldNames().forEachRemaining(field -> {
                String lower = field.toLowerCase();
                if (lower.contains("token") || lower.contains("key") || lower.contains("password")
                        || lower.contains("secret") || lower.contains("cvv") || lower.contains("pan")
                        || lower.contains("authorization") || lower.contains("thoughtsignature")) {
                    keysToRemove.add(field);
                } else {
                    sanitizeJsonNode(objNode.get(field));
                }
            });
            keysToRemove.forEach(objNode::remove);
        } else if (node.isArray()) {
            ArrayNode arrNode = (ArrayNode) node;
            for (JsonNode item : arrNode) {
                sanitizeJsonNode(item);
            }
        }
    }
}
