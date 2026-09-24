package com.ahmed.aiservice.domain.attachment.provider;

import com.ahmed.aiservice.config.AiProperties;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class GroqSpeechTranscriptionProvider implements SpeechTranscriptionProvider {
    private final AiProperties properties;
    private final RestClient restClient;

    public GroqSpeechTranscriptionProvider(AiProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(45000);
        this.restClient = RestClient.builder()
                .baseUrl(properties.getGroq().getBaseUrl())
                .requestFactory(factory)
                .build();
    }

    @Override
    public boolean isAvailable() {
        String key = properties.getGroq().getApiKey();
        return key != null && !key.isBlank();
    }

    @Override
    public String transcribe(byte[] audio, String filename, String mimeType) {
        if (!isAvailable()) throw new IllegalStateException("Speech transcription is unavailable");
        ByteArrayResource resource = new ByteArrayResource(audio) {
            @Override public String getFilename() { return filename; }
        };
        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(mimeType));
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(resource, fileHeaders));
        body.add("model", properties.getGroq().getTranscriptionModel());
        body.add("response_format", "json");
        // No language field: Whisper detects Darija, French, English and mixed speech.
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/audio/transcriptions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getGroq().getApiKey().trim())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(Map.class);
        Object text = response == null ? null : response.get("text");
        return text == null ? "" : text.toString().trim();
    }
}
