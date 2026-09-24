package com.ahmed.aiservice.domain.rag.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VectorUtilsTest {

    @Test
    @DisplayName("toPgVectorString formats array into postgres literal")
    void toPgVectorString_formatsCorrectly() {
        float[] v = new float[]{0.123f, -0.456f, 0.789f};
        String res = VectorUtils.toPgVectorString(v);
        assertThat(res).isEqualTo("[0.123,-0.456,0.789]");
    }

    @Test
    @DisplayName("toPgVectorString handles empty array")
    void toPgVectorString_empty() {
        assertThat(VectorUtils.toPgVectorString(new float[0])).isEqualTo("[]");
        assertThat(VectorUtils.toPgVectorString(null)).isEqualTo("[]");
    }

    @Test
    @DisplayName("cosineDistance gives 0 for identical vectors")
    void cosineDistance_identical() {
        float[] v1 = new float[]{1.0f, 0.0f, 0.0f};
        float[] v2 = new float[]{1.0f, 0.0f, 0.0f};
        assertThat(VectorUtils.cosineDistance(v1, v2)).isCloseTo(0.0, org.assertj.core.data.Offset.offset(0.0001));
    }

    @Test
    @DisplayName("cosineDistance gives 1 for orthogonal vectors")
    void cosineDistance_orthogonal() {
        float[] v1 = new float[]{1.0f, 0.0f};
        float[] v2 = new float[]{0.0f, 1.0f};
        assertThat(VectorUtils.cosineDistance(v1, v2)).isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.0001));
    }
}
