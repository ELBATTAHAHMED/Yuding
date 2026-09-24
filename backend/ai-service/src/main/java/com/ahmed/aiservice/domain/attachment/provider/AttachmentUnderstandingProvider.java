package com.ahmed.aiservice.domain.attachment.provider;

public interface AttachmentUnderstandingProvider {

    String analyzeImage(byte[] imageBytes, String mimeType, String contextPrompt);

    boolean isAvailable();
}
