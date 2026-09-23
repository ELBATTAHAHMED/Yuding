package com.ahmed.aiservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {

    @NotNull(message = "conversationId is required and must be a valid UUID")
    private UUID conversationId;

    @NotBlank(message = "message must not be blank")
    @Size(max = 8000, message = "message exceeds maximum allowed length of 8000 characters")
    private String message;
}
