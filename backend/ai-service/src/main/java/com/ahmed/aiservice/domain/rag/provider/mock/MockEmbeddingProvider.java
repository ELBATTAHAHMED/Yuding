package com.ahmed.aiservice.domain.rag.provider.mock;

import com.ahmed.aiservice.domain.rag.provider.EmbeddingProvider;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component("mockEmbeddingProvider")
public class MockEmbeddingProvider implements EmbeddingProvider {

    private final int dimension;

    public MockEmbeddingProvider() {
        this(768);
    }

    public MockEmbeddingProvider(int dimension) {
        this.dimension = dimension;
    }

    @Override
    public float[] embed(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text to embed cannot be null or blank");
        }

        float[] vector = new float[dimension];
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(text.toLowerCase().trim().getBytes(StandardCharsets.UTF_8));

            // Populate vector deterministically using hashed bytes & pseudo-random expansion
            long seed = 0;
            for (int i = 0; i < 8; i++) {
                seed = (seed << 8) | (hash[i] & 0xFF);
            }

            java.util.Random rnd = new java.util.Random(seed);
            double sumSq = 0.0;
            for (int i = 0; i < dimension; i++) {
                vector[i] = (float) rnd.nextGaussian();
                sumSq += vector[i] * vector[i];
            }

            // Normalize vector to unit length (L2 norm)
            double norm = Math.sqrt(sumSq);
            if (norm > 0) {
                for (int i = 0; i < dimension; i++) {
                    vector[i] = (float) (vector[i] / norm);
                }
            }
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }

        return vector;
    }

    @Override
    public List<float[]> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return Collections.emptyList();
        }
        List<float[]> results = new ArrayList<>(texts.size());
        for (String text : texts) {
            results.add(embed(text));
        }
        return results;
    }

    @Override
    public int getDimension() {
        return dimension;
    }

    @Override
    public String getProviderName() {
        return "mock";
    }
}
