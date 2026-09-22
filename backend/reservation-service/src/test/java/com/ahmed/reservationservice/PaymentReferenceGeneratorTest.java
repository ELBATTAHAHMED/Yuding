package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.service.PaymentReferenceGenerator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PaymentReferenceGenerator Tests")
class PaymentReferenceGeneratorTest {

    private final PaymentReferenceGenerator generator = new PaymentReferenceGenerator();

    @Test
    @DisplayName("Should generate valid PAY-XXXXXXXX reference")
    void shouldGenerateValidReference() {
        String ref = generator.generate();
        assertThat(ref).isNotNull();
        assertThat(ref).startsWith("PAY-");
        assertThat(ref).hasSize(12);
        assertThat(PaymentReferenceGenerator.isValid(ref)).isTrue();
    }

    @Test
    @DisplayName("Should generate unique references across iterations")
    void shouldGenerateUniqueReferences() {
        Set<String> generated = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            String ref = generator.generate();
            assertThat(generated.add(ref)).as("Reference must be unique: " + ref).isTrue();
        }
    }

    @Test
    @DisplayName("Should correctly validate valid and invalid references")
    void shouldValidateReferences() {
        assertThat(PaymentReferenceGenerator.isValid("PAY-23456789")).isTrue();
        assertThat(PaymentReferenceGenerator.isValid("PAY-ABCDEFGH")).isTrue();
        assertThat(PaymentReferenceGenerator.isValid(null)).isFalse();
        assertThat(PaymentReferenceGenerator.isValid("")).isFalse();
        assertThat(PaymentReferenceGenerator.isValid("YUD-ABCDEFGH")).isFalse(); // Wrong prefix
        assertThat(PaymentReferenceGenerator.isValid("PAY-1O0I2345")).isFalse(); // Disallowed ambiguous chars
        assertThat(PaymentReferenceGenerator.isValid("PAY-SHORT")).isFalse();
    }

    @Test
    @DisplayName("Should normalize references properly")
    void shouldNormalizeReferences() {
        assertThat(PaymentReferenceGenerator.normalize("  pay-23456789  ")).isEqualTo("PAY-23456789");
        assertThat(PaymentReferenceGenerator.normalize(null)).isNull();
    }
}
