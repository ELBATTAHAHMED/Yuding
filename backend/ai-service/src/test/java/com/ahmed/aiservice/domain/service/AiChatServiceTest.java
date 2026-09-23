package com.ahmed.aiservice.domain.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.domain.provider.AiChatCommand;
import com.ahmed.aiservice.domain.provider.AiChatResult;
import com.ahmed.aiservice.domain.provider.gemini.GeminiAiProvider;
import com.ahmed.aiservice.domain.provider.groq.GroqAiProvider;
import com.ahmed.aiservice.dto.AiChatRequest;
import com.ahmed.aiservice.dto.AiChatResponse;
import com.ahmed.aiservice.exception.AiProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiChatServiceTest {

    @Mock
    private GeminiAiProvider geminiProvider;

    @Mock
    private GroqAiProvider groqProvider;

    private AiProperties aiProperties;
    private AiChatService aiChatService;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        aiProperties.setPrimaryProvider("gemini");
        aiProperties.setPrimaryModel("gemini-3.8-flash");
        aiProperties.setFallbackEnabled(true);
        aiProperties.setFallbackProvider("groq");
        aiProperties.setFallbackModel("openai/gpt-oss-120b");
        aiProperties.setMaxOutputTokens(2048);
        aiProperties.setRequestTimeoutSeconds(30);

        aiChatService = new AiChatService(aiProperties, geminiProvider, groqProvider);
    }

    @Test
    @DisplayName("Primary Gemini provider succeeds; fallback is never invoked")
    void primaryProviderSuccess_fallbackNotInvoked() {
        UUID conversationId = UUID.randomUUID();
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(conversationId)
                .message("Bonjour, quels sont les hôtels à Marrakech ?")
                .build();

        when(geminiProvider.chat(any(AiChatCommand.class))).thenReturn(
                AiChatResult.builder()
                        .content("Marrakech offre un grand choix de riads et hôtels. Vous pouvez consulter les offres en direct sur Yuding.")
                        .model("gemini-3.8-flash")
                        .provider("gemini")
                        .promptTokens(150)
                        .completionTokens(50)
                        .latencyMs(320L)
                        .build()
        );

        AiChatResponse response = aiChatService.processChat(request);

        assertThat(response).isNotNull();
        assertThat(response.getConversationId()).isEqualTo(conversationId);
        assertThat(response.getMessageId()).isNotNull();
        assertThat(response.getRole()).isEqualTo("assistant");
        assertThat(response.getContent()).contains("Marrakech offre un grand choix");
        assertThat(response.getCreatedAt()).isNotNull();

        verify(geminiProvider, times(1)).chat(any(AiChatCommand.class));
        verify(groqProvider, never()).chat(any());
    }

    @Test
    @DisplayName("Primary Gemini fails with transient 429; falls back to Groq successfully")
    void primaryTransientError_fallsBackToGroq() {
        UUID conversationId = UUID.randomUUID();
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(conversationId)
                .message("Que visiter à Rome ?")
                .build();

        // Gemini throws transient 429
        when(geminiProvider.chat(any(AiChatCommand.class))).thenThrow(
                new AiProviderException("Rate limit reached", "GEMINI_RATE_LIMIT", true, HttpStatus.TOO_MANY_REQUESTS)
        );

        when(groqProvider.isAvailable()).thenReturn(true);

        // Groq succeeds
        when(groqProvider.chat(any(AiChatCommand.class))).thenReturn(
                AiChatResult.builder()
                        .content("À Rome, ne manquez pas le Colisée, le Vatican et la fontaine de Trevi.")
                        .model("openai/gpt-oss-120b")
                        .provider("groq")
                        .promptTokens(120)
                        .completionTokens(40)
                        .latencyMs(450L)
                        .build()
        );

        AiChatResponse response = aiChatService.processChat(request);

        assertThat(response).isNotNull();
        assertThat(response.getConversationId()).isEqualTo(conversationId);
        assertThat(response.getContent()).contains("Colisée");

        verify(geminiProvider, times(1)).chat(any(AiChatCommand.class));
        verify(groqProvider, times(1)).chat(any(AiChatCommand.class));
    }

    @Test
    @DisplayName("Primary Gemini fails with non-transient 401; fallback is NOT attempted")
    void primaryNonTransientError_doesNotFallback() {
        UUID conversationId = UUID.randomUUID();
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(conversationId)
                .message("Hello")
                .build();

        when(geminiProvider.chat(any(AiChatCommand.class))).thenThrow(
                new AiProviderException("Unauthorized API key", "GEMINI_UNAUTHORIZED", false, HttpStatus.UNAUTHORIZED)
        );

        assertThatThrownBy(() -> aiChatService.processChat(request))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("Unauthorized API key");

        verify(geminiProvider, times(1)).chat(any(AiChatCommand.class));
        verify(groqProvider, never()).chat(any());
    }

    @Test
    @DisplayName("Fallback is disabled; transient error is rethrown without calling fallback")
    void fallbackDisabled_rethrowsTransientError() {
        aiProperties.setFallbackEnabled(false);

        UUID conversationId = UUID.randomUUID();
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(conversationId)
                .message("Test message")
                .build();

        when(geminiProvider.chat(any(AiChatCommand.class))).thenThrow(
                new AiProviderException("Service unavailable", "GEMINI_503", true, HttpStatus.SERVICE_UNAVAILABLE)
        );

        assertThatThrownBy(() -> aiChatService.processChat(request))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("Service unavailable");

        verify(geminiProvider, times(1)).chat(any(AiChatCommand.class));
        verify(groqProvider, never()).chat(any());
    }

    @Test
    @DisplayName("Prompt includes travel assistant instructions and live travel truth rule")
    void systemInstructionIncludesTravelTruthRule() {
        UUID conversationId = UUID.randomUUID();
        AiChatRequest request = AiChatRequest.builder()
                .conversationId(conversationId)
                .message("Combien coûte le vol vers Tokyo ?")
                .build();

        ArgumentCaptor<AiChatCommand> captor = ArgumentCaptor.forClass(AiChatCommand.class);
        when(geminiProvider.chat(captor.capture())).thenReturn(
                AiChatResult.builder()
                        .content("Consultez nos vols en temps réel.")
                        .model("gemini-3.8-flash")
                        .provider("gemini")
                        .promptTokens(50)
                        .completionTokens(10)
                        .latencyMs(200L)
                        .build()
        );

        aiChatService.processChat(request);

        AiChatCommand command = captor.getValue();
        assertThat(command.getSystemInstruction()).contains("Yuding");
        assertThat(command.getSystemInstruction()).contains("JAMAIS inventer");
        assertThat(command.getUserMessage()).isEqualTo("Combien coûte le vol vers Tokyo ?");
    }

    @Test
    @DisplayName("Validation fails when conversationId is null or message is blank/oversized")
    void validationFailures() {
        // Null conversationId
        assertThatThrownBy(() -> aiChatService.processChat(AiChatRequest.builder().conversationId(null).message("Hello").build()))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("conversationId is required");

        // Blank message
        assertThatThrownBy(() -> aiChatService.processChat(AiChatRequest.builder().conversationId(UUID.randomUUID()).message("   ").build()))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("blank");

        // Oversized message (> 8000 chars)
        String oversized = "a".repeat(8001);
        assertThatThrownBy(() -> aiChatService.processChat(AiChatRequest.builder().conversationId(UUID.randomUUID()).message(oversized).build()))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("8000");
    }
}
