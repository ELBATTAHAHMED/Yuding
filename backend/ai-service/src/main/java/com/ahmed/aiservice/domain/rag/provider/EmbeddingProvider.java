package com.ahmed.aiservice.domain.rag.provider;

import java.util.List;

public interface EmbeddingProvider {

    /**
     * Generates a dense embedding vector for the provided text.
     *
     * @param text The input text.
     * @return Float array representing the normalized embedding vector.
     */
    float[] embed(String text);

    /**
     * Generates dense embedding vectors for a batch of texts.
     *
     * @param texts List of input texts.
     * @return List of float arrays.
     */
    List<float[]> embedBatch(List<String> texts);

    /**
     * Dimension of the output vector (e.g. 768).
     */
    int getDimension();

    /**
     * Identifying name of the embedding provider (e.g. "gemini", "mock").
     */
    String getProviderName();
}
