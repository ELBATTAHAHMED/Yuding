package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test suite for BookingReferenceGenerator format, alphabet, entropy, and validation rules.
 */
class BookingReferenceGeneratorTest {

    private BookingReferenceGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new BookingReferenceGenerator();
    }

    @Test
    @DisplayName("Generated reference strictly matches YUD-XXXXXXXX format and length 12")
    void generate_matchesStandardFormat() {
        String reference = generator.generate();

        assertThat(reference).isNotNull();
        assertThat(reference).hasSize(12);
        assertThat(reference).startsWith("YUD-");
        assertThat(BookingReferenceGenerator.isValid(reference)).isTrue();
    }

    @Test
    @DisplayName("Generated reference uses only unambiguous Base32 uppercase alphabet")
    void generate_usesOnlyAllowedAlphabet() {
        for (int i = 0; i < 100; i++) {
            String reference = generator.generate();
            String suffix = reference.substring(4);

            for (char c : suffix.toCharArray()) {
                assertThat(BookingReferenceGenerator.ALPHABET.indexOf(c))
                        .as("Character '%c' in reference '%s' must be in allowed alphabet", c, reference)
                        .isNotEqualTo(-1);
            }

            // Must NOT contain ambiguous characters 0, O, 1, I
            assertThat(reference).doesNotContain("0", "O", "1", "I");
        }
    }

    @Test
    @DisplayName("Sample generation of 1,000 references produces unique candidates (no collisions)")
    void generate_noCollisionsInSample() {
        Set<String> generated = new HashSet<>();
        int sampleSize = 1000;

        for (int i = 0; i < sampleSize; i++) {
            String ref = generator.generate();
            boolean added = generated.add(ref);
            assertThat(added).as("Reference [%s] was duplicated within sample", ref).isTrue();
        }

        assertThat(generated).hasSize(sampleSize);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "YUD-K7M4P2Q8",
            "YUD-23456789",
            "YUD-ABCDEFGH",
            "YUD-JKLMNPQR",
            "YUD-STUVWXYZ"
    })
    @DisplayName("isValid: returns true for valid canonical references")
    void isValid_validReferences_returnsTrue(String validRef) {
        assertThat(BookingReferenceGenerator.isValid(validRef)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "   ",
            "YUD-123",                    // too short
            "YUD-123456789",                // too long
            "ABC-K7M4P2Q8",                // wrong prefix
            "YUD-K7M4P2Q0",                // contains '0' (excluded)
            "YUD-K7M4P2QO",                // contains 'O' (excluded)
            "YUD-K7M4P2Q1",                // contains '1' (excluded)
            "YUD-K7M4P2QI",                // contains 'I' (excluded)
            "YUD-k7m4p2q8",                // lowercase
            "3fa85f64-5717-4562-b3fc-2c963f66afa6", // UUID
            "YUD-K7M4P2Q8; DROP TABLE;",   // SQL injection
            "YUD-K7M4 P2Q"                 // spaces
    })
    @DisplayName("isValid: rejects malformed, lowercase, ambiguous or dangerous reference strings")
    void isValid_invalidReferences_returnsFalse(String invalidRef) {
        assertThat(BookingReferenceGenerator.isValid(invalidRef)).isFalse();
    }

    @Test
    @DisplayName("normalize: trims whitespace and converts to uppercase")
    void normalize_trimsAndUppercases() {
        assertThat(BookingReferenceGenerator.normalize("  yud-k7m4p2q8  ")).isEqualTo("YUD-K7M4P2Q8");
        assertThat(BookingReferenceGenerator.normalize(null)).isNull();
    }
}
