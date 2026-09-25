package com.ahmed.identityservice.service;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.Locale;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

@Component
public class ProfileImageStorage {
    private static final long MAX_BYTES = 5 * 1024 * 1024L;
    private final Path root = Path.of(".data/profile-images").toAbsolutePath().normalize();

    public ProfileImageStorage() throws IOException { Files.createDirectories(root); }

    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) throw new IllegalArgumentException("Photo trop volumineuse (5 Mo maximum)");
        byte[] bytes = file.getBytes();
        String kind = detect(bytes);
        if (kind == null) throw new IllegalArgumentException("Format de photo non pris en charge");
        if (kind.equals("webp")) {
            validateWebpDimensions(bytes);
        } else {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null || image.getWidth() > 5000 || image.getHeight() > 5000) throw new IllegalArgumentException("Image invalide ou trop grande");
        }
        String key = UUID.randomUUID() + "." + kind;
        Files.write(root.resolve(key), bytes, StandardOpenOption.CREATE_NEW);
        return key;
    }
    private void validateWebpDimensions(byte[] bytes) {
        for (int offset = 12; offset + 8 <= bytes.length;) {
            String chunk = new String(bytes, offset, 4, StandardCharsets.US_ASCII);
            int size = (bytes[offset + 4] & 255) | ((bytes[offset + 5] & 255) << 8)
                    | ((bytes[offset + 6] & 255) << 16) | ((bytes[offset + 7] & 255) << 24);
            if (size < 0 || offset + 8L + size > bytes.length) throw new IllegalArgumentException("Image WebP invalide");
            if ("VP8X".equals(chunk)) {
                if (size < 10) throw new IllegalArgumentException("Image WebP invalide");
                int width = 1 + u24(bytes, offset + 12);
                int height = 1 + u24(bytes, offset + 15);
                if (width > 5000 || height > 5000) throw new IllegalArgumentException("Image trop grande");
                return;
            }
            offset += 8 + size + (size & 1);
        }
    }
    private int u24(byte[] bytes, int offset) {
        return (bytes[offset] & 255) | ((bytes[offset + 1] & 255) << 8) | ((bytes[offset + 2] & 255) << 16);
    }
    public byte[] load(String key) throws IOException { return Files.readAllBytes(resolve(key)); }
    public void delete(String key) { if (key != null) try { Files.deleteIfExists(resolve(key)); } catch (IOException ignored) {} }
    private Path resolve(String key) { Path p = root.resolve(key == null ? "" : key).normalize(); if (!p.startsWith(root) || key == null || !key.matches("[a-f0-9-]+\\.(jpg|png|webp)")) throw new IllegalArgumentException("Invalid photo key"); return p; }
    private String detect(byte[] b) {
        if (b.length >= 3 && (b[0] & 255) == 255 && (b[1] & 255) == 216 && (b[2] & 255) == 255) return "jpg";
        if (b.length >= 8 && (b[0] & 255) == 137 && b[1] == 80 && b[2] == 78 && b[3] == 71 && b[4] == 13 && b[5] == 10 && b[6] == 26 && b[7] == 10) return "png";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }
}
