package com.ahmed.aiservice.domain.attachment.provider;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "yuding.ai.attachments.multimodal-provider", havingValue = "mock")
public class MockAttachmentUnderstandingProvider implements AttachmentUnderstandingProvider {

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public String analyzeImage(byte[] imageBytes, String mimeType, String contextPrompt) {
        return "[MockVision: Image de voyage illustrant un hôtel en bord de mer et des recommandations d'activités culturelles.]";
    }
}
