package com.ahmed.aiservice.domain.service;

import com.ahmed.aiservice.domain.entity.AiToolCallEntity;
import com.ahmed.aiservice.domain.entity.ConversationEntity;
import com.ahmed.aiservice.domain.entity.ConversationMessageEntity;
import com.ahmed.aiservice.domain.attachment.entity.AttachmentEntity;
import com.ahmed.aiservice.domain.repository.AiToolCallRepository;
import com.ahmed.aiservice.domain.repository.ConversationMessageRepository;
import com.ahmed.aiservice.domain.repository.ConversationRepository;
import com.ahmed.aiservice.dto.ConversationMessageDto;
import com.ahmed.aiservice.dto.ConversationSummaryDto;
import com.ahmed.aiservice.dto.CreateConversationResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiConversationServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationMessageRepository messageRepository;

    @Mock
    private AiToolCallRepository toolCallRepository;

    @Mock
    private com.ahmed.aiservice.domain.rag.repository.MessageSourceRepository messageSourceRepository;

    @Mock
    private com.ahmed.aiservice.domain.attachment.repository.MessageAttachmentRepository messageAttachmentRepository;

    @Mock
    private com.ahmed.aiservice.domain.attachment.repository.AttachmentRepository attachmentRepository;

    @Mock
    private com.ahmed.aiservice.domain.attachment.storage.AttachmentStorage attachmentStorage;

    private ObjectMapper objectMapper;
    private AiConversationService conversationService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        conversationService = new AiConversationService(conversationRepository, messageRepository, toolCallRepository, messageSourceRepository, messageAttachmentRepository, attachmentRepository, attachmentStorage, objectMapper);
    }

    @Test
    void deleteConversationRemovesOwnedRecordAndStoredFiles() {
        UUID userId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        var conversation = ConversationEntity.builder().id(conversationId).userId(userId).build();
        var attachment = AttachmentEntity.builder().storageKey("private_voice.webm").build();
        when(conversationRepository.findByIdAndUserId(conversationId, userId)).thenReturn(Optional.of(conversation));
        when(attachmentRepository.findByUserIdAndConversationIdOrderByCreatedAtAsc(userId, conversationId))
                .thenReturn(List.of(attachment));
        when(conversationRepository.deleteOwnedById(conversationId, userId)).thenReturn(1);

        conversationService.deleteConversation(conversationId, userId);

        verify(conversationRepository).deleteOwnedById(conversationId, userId);
        verify(attachmentStorage).delete("private_voice.webm");
        verifyNoInteractions(messageSourceRepository);
    }

    @Test
    void deleteConversationRejectsOtherOwnerWithoutTouchingData() {
        UUID otherUser = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        when(conversationRepository.findByIdAndUserId(conversationId, otherUser)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> conversationService.deleteConversation(conversationId, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
        verify(conversationRepository, never()).deleteOwnedById(any(), any());
        verifyNoInteractions(attachmentRepository, attachmentStorage);
    }

    @Test
    @DisplayName("createConversation generates new active conversation for user")
    void createConversation_success() {
        UUID userId = UUID.randomUUID();
        when(conversationRepository.save(any(ConversationEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateConversationResponse response = conversationService.createConversation(userId, "Voyage à Marrakech");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Voyage à Marrakech");
        assertThat(response.getCreatedAt()).isNotNull();
        verify(conversationRepository, times(1)).save(any(ConversationEntity.class));
    }

    @Test
    @DisplayName("getConversations returns list ordered by activity")
    void getConversations_success() {
        UUID userId = UUID.randomUUID();
        ConversationEntity conv = ConversationEntity.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .title("Mon séjour")
                .status("ACTIVE")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .lastMessageAt(Instant.now())
                .build();

        when(conversationRepository.findByUserIdOrderByActivity(eq(userId), any(Pageable.class)))
                .thenReturn(List.of(conv));

        List<ConversationSummaryDto> result = conversationService.getConversations(userId, 20);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Mon séjour");
    }

    @Test
    @DisplayName("getConversationMessages returns messages with tool metadata for owner")
    void getConversationMessages_ownerSuccess() {
        UUID userId = UUID.randomUUID();
        UUID convId = UUID.randomUUID();
        UUID asstMsgId = UUID.randomUUID();

        ConversationEntity conv = ConversationEntity.builder()
                .id(convId)
                .userId(userId)
                .title("Test")
                .status("ACTIVE")
                .build();

        ConversationMessageEntity userMsg = ConversationMessageEntity.builder()
                .id(UUID.randomUUID())
                .conversationId(convId)
                .role("USER")
                .content("Météo à Paris")
                .sequenceNumber(1)
                .createdAt(Instant.now())
                .build();

        ConversationMessageEntity asstMsg = ConversationMessageEntity.builder()
                .id(asstMsgId)
                .conversationId(convId)
                .role("ASSISTANT")
                .content("Il fait 18°C")
                .grounded(true)
                .sequenceNumber(2)
                .createdAt(Instant.now())
                .build();

        AiToolCallEntity tc = AiToolCallEntity.builder()
                .id(UUID.randomUUID())
                .conversationId(convId)
                .assistantMessageId(asstMsgId)
                .toolName("getWeather")
                .status("SUCCESS")
                .build();

        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));
        when(messageRepository.findByConversationIdOrderBySequenceNumberAscCreatedAtAsc(convId))
                .thenReturn(List.of(userMsg, asstMsg));
        when(toolCallRepository.findByAssistantMessageId(asstMsgId)).thenReturn(List.of(tc));

        List<ConversationMessageDto> dtos = conversationService.getConversationMessages(convId, userId);

        assertThat(dtos).hasSize(2);
        assertThat(dtos.get(0).getRole()).isEqualTo("user");
        assertThat(dtos.get(1).getRole()).isEqualTo("assistant");
        assertThat(dtos.get(1).isGrounded()).isTrue();
        assertThat(dtos.get(1).getToolsUsed()).contains("getWeather");
    }

    @Test
    @DisplayName("getConversationMessages throws 404 when user is not owner (IDOR protection)")
    void getConversationMessages_idorBlockedWith404() {
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();
        UUID convId = UUID.randomUUID();

        ConversationEntity conv = ConversationEntity.builder()
                .id(convId)
                .userId(ownerId) // Owned by user A
                .title("Secret trip")
                .build();

        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));

        assertThatThrownBy(() -> conversationService.getConversationMessages(convId, attackerId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    @DisplayName("sanitizeJsonForStorage strips sensitive token, password, and thoughtSignature keys")
    void sanitizeJsonForStorage_stripsSensitiveKeys() {
        var rawData = java.util.Map.of(
                "apiKey", "secret-12345",
                "userPassword", "pwd_pass",
                "thoughtSignature", "internal-reasoning-token",
                "validFlight", "AF123",
                "price", 150
        );

        String sanitized = conversationService.sanitizeJsonForStorage(rawData);

        assertThat(sanitized).doesNotContain("secret-12345");
        assertThat(sanitized).doesNotContain("pwd_pass");
        assertThat(sanitized).doesNotContain("internal-reasoning-token");
        assertThat(sanitized).contains("AF123");
        assertThat(sanitized).contains("150");
    }
}
