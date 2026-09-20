package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "Status is required")
        UserStatus status
) {}
