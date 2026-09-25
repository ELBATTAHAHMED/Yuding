package com.ahmed.identityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecentViewRequest(
        @NotBlank(message = "Le type de ressource est obligatoire")
        @Size(max = 32)
        String resourceType,

        @NotBlank(message = "La référence de la ressource est obligatoire")
        @Size(max = 128)
        String resourceReference,

        @NotBlank(message = "Le titre est obligatoire")
        @Size(max = 255)
        String title,

        @Size(max = 255)
        String destination,

        @Size(max = 1024)
        String thumbnailUrl,

        @Size(max = 64)
        String providerLabel
) {}
