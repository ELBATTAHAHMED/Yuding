package com.ahmed.aiservice.domain.attachment.controller;

import com.ahmed.aiservice.domain.attachment.dto.AiAttachmentDto;
import com.ahmed.aiservice.domain.attachment.entity.AttachmentEntity;
import com.ahmed.aiservice.domain.attachment.service.AttachmentService;
import com.ahmed.aiservice.config.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping(value = "/conversations/{conversationId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AiAttachmentDto> uploadAttachment(
            @PathVariable UUID conversationId,
            @RequestParam("file") MultipartFile file) {

        UUID userId = SecurityUtils.getCurrentUserUuid();
        log.info("Received attachment upload for conversation {} from user {}", conversationId, userId);

        AiAttachmentDto dto = attachmentService.uploadAttachment(conversationId, userId, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/attachments/{attachmentId}/content")
    public ResponseEntity<byte[]> getAttachmentContent(@PathVariable UUID attachmentId) {
        UUID userId = SecurityUtils.getCurrentUserUuid();
        AttachmentEntity entity = attachmentService.getAttachmentEntity(attachmentId, userId);
        byte[] content = attachmentService.getAttachmentContent(attachmentId, userId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + entity.getOriginalFilename() + "\"")
                .contentType(MediaType.parseMediaType(entity.getMimeType()))
                .body(content);
    }

    @DeleteMapping("/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable UUID attachmentId) {
        UUID userId = SecurityUtils.getCurrentUserUuid();
        attachmentService.deleteAttachment(attachmentId, userId);
        return ResponseEntity.noContent().build();
    }
}
