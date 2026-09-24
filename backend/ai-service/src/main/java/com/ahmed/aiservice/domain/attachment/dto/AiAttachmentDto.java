package com.ahmed.aiservice.domain.attachment.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAttachmentDto {

    private UUID id;
    private String publicReference;
    private String originalFilename;
    private String mimeType;
    private long sizeBytes;
    private String kind; // IMAGE, DOCUMENT
    private String status; // UPLOADED, PROCESSED, FAILED
    private Instant createdAt;
}
