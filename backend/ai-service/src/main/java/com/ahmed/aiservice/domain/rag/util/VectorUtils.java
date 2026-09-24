package com.ahmed.aiservice.domain.rag.util;

public final class VectorUtils {

    private VectorUtils() {}

    /**
     * Converts a float array to PostgreSQL pgvector literal format: "[0.123,0.456,...]"
     */
    public static String toPgVectorString(float[] vector) {
        if (vector == null || vector.length == 0) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder(vector.length * 8 + 2);
        sb.append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(vector[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    /**
     * Calculates cosine distance (1 - cosine similarity) between two vectors.
     */
    public static double cosineDistance(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) {
            throw new IllegalArgumentException("Vectors must have matching non-null dimensions");
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA <= 0 || normB <= 0) {
            return 1.0;
        }
        double similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
        return Math.max(0.0, 1.0 - similarity);
    }
}
