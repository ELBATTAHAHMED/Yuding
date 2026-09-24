package com.ahmed.aiservice.domain.attachment.provider;

public interface SpeechTranscriptionProvider {
    boolean isAvailable();
    String transcribe(byte[] audio, String filename, String mimeType);
}
