package com.ahmed.aiservice.domain.attachment.service;

import com.ahmed.aiservice.domain.attachment.dto.AiAttachmentDto;
import com.ahmed.aiservice.domain.attachment.entity.AttachmentEntity;
import com.ahmed.aiservice.domain.attachment.entity.MessageAttachmentEntity;
import com.ahmed.aiservice.domain.attachment.provider.AttachmentUnderstandingProvider;
import com.ahmed.aiservice.domain.attachment.provider.SpeechTranscriptionProvider;
import com.ahmed.aiservice.domain.attachment.repository.AttachmentRepository;
import com.ahmed.aiservice.domain.attachment.repository.MessageAttachmentRepository;
import com.ahmed.aiservice.domain.attachment.storage.AttachmentStorage;
import com.ahmed.aiservice.domain.entity.ConversationEntity;
import com.ahmed.aiservice.domain.entity.ConversationMessageEntity;
import com.ahmed.aiservice.domain.repository.ConversationMessageRepository;
import com.ahmed.aiservice.domain.repository.ConversationRepository;
import com.ahmed.aiservice.domain.util.ReferenceGenerator;
import com.ahmed.aiservice.exception.AiProviderException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final MessageAttachmentRepository messageAttachmentRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository conversationMessageRepository;
    private final AttachmentStorage attachmentStorage;
    private final AttachmentSafetyService safetyService;
    private final DocumentTextExtractor documentTextExtractor;

    @Autowired(required = false)
    private AttachmentUnderstandingProvider multimodalProvider;

    @Autowired(required = false)
    private SpeechTranscriptionProvider speechTranscriptionProvider;

    @Transactional
    public AiAttachmentDto uploadAttachment(UUID conversationId, UUID userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AiProviderException("Le fichier téléversé est vide", "ATTACHMENT_EMPTY", false, HttpStatus.BAD_REQUEST);
        }

        ConversationEntity conv = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new AiProviderException("Conversation introuvable ou non autorisée", "CONVERSATION_ACCESS_DENIED", false, HttpStatus.FORBIDDEN));

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new AiProviderException("Impossible de lire le fichier téléversé", "ATTACHMENT_READ_ERROR", false, HttpStatus.BAD_REQUEST);
        }

        AttachmentSafetyService.ValidatedFile validated = safetyService.validateAndInspect(
                file.getOriginalFilename(), file.getContentType(), bytes
        );

        UUID attachmentId = UUID.randomUUID();
        String publicRef = ReferenceGenerator.generateAttachmentReference();

        String storageKey;
        try {
            storageKey = attachmentStorage.store(attachmentId, validated.originalFilename(), bytes);
        } catch (IOException e) {
            log.error("Failed to store attachment file {}: {}", publicRef, e.getMessage(), e);
            throw new AiProviderException("Échec du stockage du fichier", "ATTACHMENT_STORAGE_FAILED", true, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int completionStatus) {
                    if (completionStatus != STATUS_COMMITTED) attachmentStorage.delete(storageKey);
                }
            });
        }

        String extractedText = "";
        String status = "PROCESSED";
        if ("DOCUMENT".equals(validated.kind())) {
            extractedText = documentTextExtractor.extractText(bytes, validated.mimeType());
        } else if ("AUDIO".equals(validated.kind())) {
            try {
                if (speechTranscriptionProvider == null || !speechTranscriptionProvider.isAvailable()) {
                    throw new IllegalStateException("Transcription provider unavailable");
                }
                extractedText = speechTranscriptionProvider.transcribe(bytes, validated.originalFilename(), validated.mimeType());
                if (extractedText.isBlank()) status = "FAILED";
            } catch (Exception e) {
                log.warn("Voice transcription unavailable for attachment {} (type={})", publicRef, e.getClass().getSimpleName());
                status = "FAILED";
            }
        } else if ("IMAGE".equals(validated.kind()) && multimodalProvider != null && multimodalProvider.isAvailable()) {
            try {
                extractedText = multimodalProvider.analyzeImage(bytes, validated.mimeType(), null);
            } catch (Exception e) {
                log.warn("Multimodal image analysis failed for {}: {}", publicRef, e.getMessage());
                extractedText = "[Image: " + validated.originalFilename() + "]";
            }
        }

        AttachmentEntity entity = AttachmentEntity.builder()
                .id(attachmentId)
                .publicReference(publicRef)
                .userId(userId)
                .conversation(conv)
                .originalFilename(validated.originalFilename())
                .storageKey(storageKey)
                .mimeType(validated.mimeType())
                .sizeBytes(validated.sizeBytes())
                .sha256Hash(validated.sha256Hash())
                .kind(validated.kind())
                .status(status)
                .extractedText(extractedText)
                .build();

        AttachmentEntity saved = attachmentRepository.save(entity);
        log.info("Attachment uploaded successfully: id={}, ref={}, size={} bytes, mime={}", saved.getId(), saved.getPublicReference(), saved.getSizeBytes(), saved.getMimeType());

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public byte[] getAttachmentContent(UUID attachmentId, UUID userId) {
        AttachmentEntity entity = attachmentRepository.findByIdAndUserId(attachmentId, userId)
                .orElseThrow(() -> new AiProviderException("Fichier introuvable ou non autorisé", "ATTACHMENT_NOT_FOUND", false, HttpStatus.NOT_FOUND));

        try {
            return attachmentStorage.load(entity.getStorageKey());
        } catch (IOException e) {
            log.error("Failed to load attachment content for {}: {}", entity.getPublicReference(), e.getMessage());
            throw new AiProviderException("Fichier introuvable sur le stockage", "ATTACHMENT_CONTENT_MISSING", false, HttpStatus.NOT_FOUND);
        }
    }

    @Transactional(readOnly = true)
    public AttachmentEntity getAttachmentEntity(UUID attachmentId, UUID userId) {
        return attachmentRepository.findByIdAndUserId(attachmentId, userId)
                .orElseThrow(() -> new AiProviderException("Fichier introuvable ou non autorisé", "ATTACHMENT_NOT_FOUND", false, HttpStatus.NOT_FOUND));
    }

    @Transactional
    public void deleteAttachment(UUID attachmentId, UUID userId) {
        AttachmentEntity entity = attachmentRepository.findByIdAndUserId(attachmentId, userId)
                .orElseThrow(() -> new AiProviderException("Fichier introuvable ou non autorisé", "ATTACHMENT_NOT_FOUND", false, HttpStatus.NOT_FOUND));

        attachmentRepository.delete(entity);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { attachmentStorage.delete(entity.getStorageKey()); }
            });
        } else {
            attachmentStorage.delete(entity.getStorageKey());
        }
        log.info("Deleted attachment: id={}, ref={}", attachmentId, entity.getPublicReference());
    }

    @Transactional
    public void linkAttachmentsToMessage(UUID messageId, List<UUID> attachmentIds, UUID userId) {
        if (attachmentIds == null || attachmentIds.isEmpty()) {
            return;
        }

        ConversationMessageEntity msg = conversationMessageRepository.findById(messageId)
                .orElseThrow(() -> new AiProviderException("Message introuvable", "MESSAGE_NOT_FOUND", false, HttpStatus.NOT_FOUND));

        for (UUID attId : attachmentIds) {
            AttachmentEntity att = attachmentRepository.findByIdAndUserId(attId, userId)
                    .orElseThrow(() -> new AiProviderException("Pièce jointe " + attId + " non autorisée pour cet utilisateur", "ATTACHMENT_ACCESS_DENIED", false, HttpStatus.FORBIDDEN));

            if (!att.getConversation().getId().equals(msg.getConversationId())) {
                throw new AiProviderException("La pièce jointe n'appartient pas à cette conversation", "ATTACHMENT_CONVERSATION_MISMATCH", false, HttpStatus.FORBIDDEN);
            }

            MessageAttachmentEntity link = MessageAttachmentEntity.builder()
                    .message(msg)
                    .attachment(att)
                    .build();
            messageAttachmentRepository.save(link);
        }
    }

    @Transactional(readOnly = true)
    public void validateSelection(UUID conversationId, UUID userId, List<UUID> attachmentIds) {
        if (attachmentIds == null || attachmentIds.isEmpty()) return;
        if (attachmentIds.size() > 4 || new HashSet<>(attachmentIds).size() != attachmentIds.size()) {
            throw new AiProviderException("Maximum 4 pièces jointes", "ATTACHMENT_LIMIT", false, HttpStatus.BAD_REQUEST);
        }
        long total = 0;
        for (UUID id : attachmentIds) {
            AttachmentEntity attachment = attachmentRepository.findByIdAndUserId(id, userId)
                    .orElseThrow(() -> new AiProviderException("Pièce jointe introuvable", "ATTACHMENT_NOT_FOUND", false, HttpStatus.NOT_FOUND));
            if (!attachment.getConversation().getId().equals(conversationId)) {
                throw new AiProviderException("Pièce jointe hors conversation", "ATTACHMENT_CONVERSATION_MISMATCH", false, HttpStatus.NOT_FOUND);
            }
            total += attachment.getSizeBytes();
            if (total > 20 * 1024 * 1024L) {
                throw new AiProviderException("Pièces jointes trop volumineuses", "ATTACHMENT_TOTAL_TOO_LARGE", false, HttpStatus.BAD_REQUEST);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<AiAttachmentDto> getAttachmentsForMessage(UUID messageId) {
        return messageAttachmentRepository.findByMessageIdWithAttachment(messageId).stream()
                .map(ma -> toDto(ma.getAttachment()))
                .collect(Collectors.toList());
    }

    public AiAttachmentDto toDto(AttachmentEntity entity) {
        return AiAttachmentDto.builder()
                .id(entity.getId())
                .publicReference(entity.getPublicReference())
                .originalFilename(entity.getOriginalFilename())
                .mimeType(entity.getMimeType())
                .sizeBytes(entity.getSizeBytes())
                .kind(entity.getKind())
                .status(entity.getStatus())
                .transcript("AUDIO".equals(entity.getKind()) ? entity.getExtractedText() : null)
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
