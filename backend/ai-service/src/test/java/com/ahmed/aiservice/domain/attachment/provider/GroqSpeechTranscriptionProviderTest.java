package com.ahmed.aiservice.domain.attachment.provider;

import com.ahmed.aiservice.config.AiProperties;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class GroqSpeechTranscriptionProviderTest {

    @Test
    void retriesTransientProviderFailure() throws Exception {
        AtomicInteger requests = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/audio/transcriptions", exchange -> {
            exchange.getRequestBody().readAllBytes();
            boolean firstRequest = requests.incrementAndGet() == 1;
            byte[] body = (firstRequest ? "temporary outage" : "{\"text\":\"Bonjour\"}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", firstRequest ? "text/plain" : "application/json");
            exchange.sendResponseHeaders(firstRequest ? 503 : 200, body.length);
            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        });
        server.start();
        try {
            AiProperties properties = new AiProperties();
            properties.getGroq().setApiKey("test-key");
            properties.getGroq().setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());

            String result = new GroqSpeechTranscriptionProvider(properties)
                    .transcribe(new byte[]{1, 2, 3}, "voice.webm", "audio/webm");

            assertThat(result).isEqualTo("Bonjour");
            assertThat(requests.get()).isEqualTo(2);
        } finally {
            server.stop(0);
        }
    }
}
