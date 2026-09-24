package com.ahmed.aiservice.domain.rag.service;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class KnowledgeChunker {

    private static final int MAX_CHUNK_CHARS = 900;
    private static final int MIN_CHUNK_CHARS = 100;
    private static final int OVERLAP_CHARS = 100;

    public record RawChunk(int chunkIndex, String sectionTitle, String content, String contentHash) {}

    public List<RawChunk> chunkDocument(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return List.of();
        }

        List<RawChunk> chunks = new ArrayList<>();
        String[] lines = markdown.split("\r?\n");

        String currentSection = "Général";
        StringBuilder currentBuffer = new StringBuilder();
        int chunkIndex = 0;

        Pattern headingPattern = Pattern.compile("^(#{1,3})\\s+(.+)$");

        for (String line : lines) {
            Matcher m = headingPattern.matcher(line.trim());
            if (m.matches()) {
                // If we already have content in buffer, flush it as chunk(s)
                if (currentBuffer.length() >= MIN_CHUNK_CHARS) {
                    List<String> subChunks = splitBuffer(currentBuffer.toString());
                    for (String text : subChunks) {
                        chunks.add(new RawChunk(chunkIndex++, currentSection, text.trim(), computeSha256(text.trim())));
                    }
                    currentBuffer.setLength(0);
                }
                currentSection = m.group(2).trim();
                currentBuffer.append(line).append("\n\n");
            } else {
                currentBuffer.append(line).append("\n");
                if (currentBuffer.length() >= MAX_CHUNK_CHARS) {
                    List<String> subChunks = splitBuffer(currentBuffer.toString());
                    for (String text : subChunks) {
                        chunks.add(new RawChunk(chunkIndex++, currentSection, text.trim(), computeSha256(text.trim())));
                    }
                    currentBuffer.setLength(0);
                }
            }
        }

        if (currentBuffer.length() >= MIN_CHUNK_CHARS) {
            List<String> subChunks = splitBuffer(currentBuffer.toString());
            for (String text : subChunks) {
                chunks.add(new RawChunk(chunkIndex++, currentSection, text.trim(), computeSha256(text.trim())));
            }
        }

        // If whole document was smaller than MIN_CHUNK_CHARS, produce single chunk
        if (chunks.isEmpty() && !markdown.isBlank()) {
            chunks.add(new RawChunk(0, "Général", markdown.trim(), computeSha256(markdown.trim())));
        }

        return chunks;
    }

    private List<String> splitBuffer(String text) {
        List<String> result = new ArrayList<>();
        if (text.length() <= MAX_CHUNK_CHARS) {
            result.add(text);
            return result;
        }

        String[] paragraphs = text.split("\n\n+");
        StringBuilder current = new StringBuilder();

        for (String p : paragraphs) {
            String trimmed = p.trim();
            if (trimmed.isEmpty()) continue;

            if (current.length() + trimmed.length() + 2 > MAX_CHUNK_CHARS && current.length() > 0) {
                result.add(current.toString().trim());
                current.setLength(0);
            }
            if (current.length() > 0) {
                current.append("\n\n");
            }
            current.append(trimmed);
        }

        if (current.length() > 0) {
            result.add(current.toString().trim());
        }

        return result;
    }

    public static String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
