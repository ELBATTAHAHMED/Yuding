package com.ahmed.identityservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyPasswordResetCodeRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Verification code is required")
        @Pattern(regexp = "^[0-9]{6}$", message = "Verification code must contain 6 digits")
        String code
) {
}
