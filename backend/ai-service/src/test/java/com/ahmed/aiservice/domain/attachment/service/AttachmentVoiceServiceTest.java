package com.ahmed.aiservice.domain.attachment.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.attachment.entity.AttachmentEntity;
import com.ahmed.aiservice.domain.attachment.provider.SpeechTranscriptionProvider;
import com.ahmed.aiservice.domain.attachment.repository.AttachmentRepository;
import com.ahmed.aiservice.domain.attachment.repository.MessageAttachmentRepository;
import com.ahmed.aiservice.domain.attachment.storage.AttachmentStorage;
import com.ahmed.aiservice.domain.entity.ConversationEntity;
import com.ahmed.aiservice.domain.repository.ConversationMessageRepository;
import com.ahmed.aiservice.domain.repository.ConversationRepository;
import com.ahmed.aiservice.exception.AiProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentVoiceServiceTest {
    @Mock AttachmentRepository attachments;
    @Mock MessageAttachmentRepository links;
    @Mock ConversationRepository conversations;
    @Mock ConversationMessageRepository messages;
    @Mock AttachmentStorage storage;
    @Mock DocumentTextExtractor documents;
    @Mock SpeechTranscriptionProvider speech;
    AttachmentService service;

    private static byte[] webm() {
        return new byte[]{0x1a, 0x45, (byte) 0xdf, (byte) 0xa3, 0x42, (byte) 0x86, 0x01, 0x00,
                0x42, (byte) 0x82, (byte) 0x84, 'w', 'e', 'b', 'm'};
    }

    @BeforeEach
    void setUp() {
        service = new AttachmentService(attachments, links, conversations, messages, storage,
                new AttachmentSafetyService(new AiProperties()), documents);
        ReflectionTestUtils.setField(service, "speechTranscriptionProvider", speech);
    }

    @Test
    void voiceIsTranscribedAndStoredInItsConversation() throws Exception {
        UUID owner = UUID.randomUUID(), conversationId = UUID.randomUUID();
        when(conversations.findByIdAndUserId(conversationId, owner)).thenReturn(Optional.of(ConversationEntity.builder().id(conversationId).userId(owner).build()));
        when(storage.store(any(), any(), any())).thenReturn("private.webm");
        when(speech.isAvailable()).thenReturn(true);
        when(speech.transcribe(any(), any(), any())).thenReturn("Bghit nmchi mn Casablanca l Paris");
        when(attachments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.uploadAttachment(conversationId, owner,
                new MockMultipartFile("file", "voice.webm", "audio/webm;codecs=opus", webm()));

        assertThat(result.getKind()).isEqualTo("AUDIO");
        assertThat(result.getTranscript()).isEqualTo("Bghit nmchi mn Casablanca l Paris");
        assertThat(result.getStatus()).isEqualTo("PROCESSED");
        verify(attachments).save(argThat((AttachmentEntity entity) -> entity.getConversation().getId().equals(conversationId)));
    }

    @Test
    void transcriptionFailureKeepsPrivateAudio() throws Exception {
        UUID owner = UUID.randomUUID(), conversationId = UUID.randomUUID();
        when(conversations.findByIdAndUserId(conversationId, owner)).thenReturn(Optional.of(ConversationEntity.builder().id(conversationId).userId(owner).build()));
        when(storage.store(any(), any(), any())).thenReturn("private.webm");
        when(speech.isAvailable()).thenReturn(true);
        when(speech.transcribe(any(), any(), any())).thenThrow(new IllegalStateException("offline"));
        when(attachments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.uploadAttachment(conversationId, owner,
                new MockMultipartFile("file", "voice.webm", "audio/webm", webm()));

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getTranscript()).isEmpty();
        verify(attachments).save(any());
    }

    @Test
    void anotherAccountCannotReadAudio() {
        assertThatThrownBy(() -> service.getAttachmentContent(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(AiProviderException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void rolledBackUploadRemovesPrivateFile() throws Exception {
        UUID owner = UUID.randomUUID(), conversationId = UUID.randomUUID();
        when(conversations.findByIdAndUserId(conversationId, owner)).thenReturn(Optional.of(ConversationEntity.builder().id(conversationId).userId(owner).build()));
        when(storage.store(any(), any(), any())).thenReturn("rollback.webm");
        when(attachments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.uploadAttachment(conversationId, owner,
                    new MockMultipartFile("file", "voice.webm", "audio/webm", webm()));
            verify(storage, never()).delete("rollback.webm");
            TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            verify(storage).delete("rollback.webm");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
