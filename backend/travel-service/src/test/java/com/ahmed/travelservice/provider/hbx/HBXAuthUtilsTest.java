package com.ahmed.travelservice.provider.hbx;

import com.ahmed.travelservice.provider.impl.hbx.HBXAuthUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HBXAuthUtilsTest {

    @Test
    @DisplayName("generateSignature produces expected SHA-256 hex string")
    void generateSignature_validInputs_producesExpectedHash() {
        String apiKey = "testApiKey123";
        String secret = "testSecret456";
        long timestamp = 1700000000L;

        String signature = HBXAuthUtils.generateSignature(apiKey, secret, timestamp);

        assertThat(signature).isNotNull();
        assertThat(signature).hasSize(64);
        assertThat(signature).matches("^[0-9a-f]{64}$");

        // Verify deterministic reproduction
        String signature2 = HBXAuthUtils.generateSignature(apiKey, secret, timestamp);
        assertThat(signature).isEqualTo(signature2);
    }

    @Test
    @DisplayName("generateSignature throws IllegalArgumentException when apiKey or secret is null")
    void generateSignature_nullInputs_throwsException() {
        assertThatThrownBy(() -> HBXAuthUtils.generateSignature(null, "secret", 12345L))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> HBXAuthUtils.generateSignature("key", null, 12345L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
