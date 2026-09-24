package com.ahmed.aiservice.domain.attachment.storage;

import com.ahmed.aiservice.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

@Component
@Slf4j
public class LocalAttachmentStorage implements AttachmentStorage {

    private final Path rootPath;

    public LocalAttachmentStorage(AiProperties properties) {
        String dir = properties.getAttachments().getStorageDir();
        this.rootPath = Paths.get(dir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootPath);
            log.info("LocalAttachmentStorage initialized at: {}", this.rootPath);
        } catch (IOException e) {
            log.error("Failed to initialize attachment storage directory: {}", this.rootPath, e);
        }
    }

    @Override
    public String store(UUID attachmentId, String originalFilename, byte[] content) throws IOException {
        String safeName = sanitizeFilename(originalFilename);
        String storageKey = attachmentId.toString() + "_" + safeName;
        Path targetPath = resolveSafe(storageKey);

        Files.createDirectories(targetPath.getParent());
        Files.write(targetPath, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        log.debug("Stored attachment {} ({} bytes) at {}", storageKey, content.length, targetPath);
        return storageKey;
    }

    @Override
    public byte[] load(String storageKey) throws IOException {
        Path targetPath = resolveSafe(storageKey);
        if (!Files.exists(targetPath)) {
            throw new IOException("Attachment not found for storageKey: " + storageKey);
        }
        return Files.readAllBytes(targetPath);
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path targetPath = resolveSafe(storageKey);
            if (Files.exists(targetPath)) {
                Files.delete(targetPath);
                log.debug("Deleted attachment: {}", storageKey);
            }
        } catch (Exception e) {
            log.warn("Failed to delete attachment: {} ({})", storageKey, e.getMessage());
        }
    }

    private Path resolveSafe(String storageKey) {
        String cleanKey = storageKey.replace("..", "").replace("/", "").replace("\\", "");
        Path resolved = rootPath.resolve(cleanKey).normalize();
        if (!resolved.startsWith(rootPath)) {
            throw new SecurityException("Path traversal attempt detected in attachment storage key: " + storageKey);
        }
        return resolved;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "attachment.bin";
        }
        String clean = new File(filename).getName();
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (clean.length() > 100) {
            clean = clean.substring(clean.length() - 100);
        }
        return clean.isBlank() ? "file.bin" : clean;
    }
}
