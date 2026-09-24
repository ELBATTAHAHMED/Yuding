package com.ahmed.aiservice.domain.attachment.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.exception.AiProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@Slf4j
public class AttachmentSafetyService {

    private static final long MAX_IMAGE_SIZE = 8 * 1024 * 1024L; // 8MB
    private static final long MAX_DOCUMENT_SIZE = 10 * 1024 * 1024L; // 10MB
    private static final int MAX_IMAGE_DIMENSION = 4096;

    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_DOC_EXTENSIONS = Set.of("pdf", "txt", "md", "csv", "docx");
    private static final Set<String> FORBIDDEN_EXTENSIONS = Set.of(
            "svg", "html", "htm", "js", "ts", "jsx", "tsx", "exe", "dll", "bat", "sh", "cmd", "vbs",
            "zip", "rar", "7z", "tar", "gz", "iso", "bin", "jar", "war", "ear"
    );

    private final AiProperties properties;

    public AttachmentSafetyService(AiProperties properties) {
        this.properties = properties;
    }

    public record ValidatedFile(
            String originalFilename,
            String mimeType,
            String kind, // IMAGE, DOCUMENT
            long sizeBytes,
            String sha256Hash
    ) {}

    public ValidatedFile validateAndInspect(String rawFilename, String reportedContentType, byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new AiProviderException("Le fichier téléversé est vide", "ATTACHMENT_EMPTY", false, HttpStatus.BAD_REQUEST);
        }

        if (bytes.length > MAX_DOCUMENT_SIZE) {
            throw new AiProviderException("La taille du fichier dépasse la limite maximale autorisée (10 Mo)", "ATTACHMENT_TOO_LARGE", false, HttpStatus.BAD_REQUEST);
        }

        String filename = sanitizeFilename(rawFilename);
        String ext = getFileExtension(filename).toLowerCase(Locale.ROOT);

        if (FORBIDDEN_EXTENSIONS.contains(ext)) {
            throw new AiProviderException("Type de fichier non autorisé : ." + ext + " (les fichiers HTML et SVG ne sont pas autorisés)", "ATTACHMENT_TYPE_FORBIDDEN", false, HttpStatus.BAD_REQUEST);
        }

        // Sniff MIME type from bytes
        String detectedMime = sniffMimeType(bytes, ext);
        if (detectedMime == null) {
            throw new AiProviderException("Format de fichier non reconnu ou ne correspond pas au contenu", "ATTACHMENT_UNSUPPORTED_FORMAT", false, HttpStatus.BAD_REQUEST);
        }

        boolean isImage = detectedMime.startsWith("image/");
        boolean isDoc = !isImage;

        if (isImage) {
            if (bytes.length > MAX_IMAGE_SIZE) {
                throw new AiProviderException("La taille de l'image dépasse la limite de 8 Mo", "ATTACHMENT_TOO_LARGE", false, HttpStatus.BAD_REQUEST);
            }
            validateImageDimensions(bytes, detectedMime);
        }

        String sha256 = computeSha256(bytes);
        String kind = isImage ? "IMAGE" : "DOCUMENT";

        return new ValidatedFile(filename, detectedMime, kind, bytes.length, sha256);
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "file";
        String clean = filename.replace("\\", "/");
        int lastSlash = clean.lastIndexOf('/');
        if (lastSlash >= 0) {
            clean = clean.substring(lastSlash + 1);
        }
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.isBlank() ? "file" : clean;
    }

    private void validateImageDimensions(byte[] bytes, String mimeType) {
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(bytes));
            if (img != null) {
                if (img.getWidth() > MAX_IMAGE_DIMENSION || img.getHeight() > MAX_IMAGE_DIMENSION) {
                    throw new AiProviderException("Dimensions de l'image trop élevées (max " + MAX_IMAGE_DIMENSION + "x" + MAX_IMAGE_DIMENSION + ")",
                            "ATTACHMENT_IMAGE_TOO_LARGE", false, HttpStatus.BAD_REQUEST);
                }
            }
        } catch (AiProviderException ape) {
            throw ape;
        } catch (Exception e) {
            log.warn("Could not inspect image dimensions: {}", e.getMessage());
        }
    }

    private String sniffMimeType(byte[] bytes, String ext) {
        // 1. JPEG: FF D8 FF
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.length >= 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
            return "image/png";
        }
        // 3. WebP: RIFF .... WEBP
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }
        // 4. PDF: %PDF-
        if (bytes.length >= 5 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F' && bytes[4] == '-') {
            return "application/pdf";
        }
        // 5. DOCX: PK 03 04 and contains word/
        if (bytes.length >= 4 && bytes[0] == 'P' && bytes[1] == 'K' && bytes[2] == 0x03 && bytes[3] == 0x04) {
            if ("docx".equals(ext) && isDocxArchive(bytes)) {
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            }
            return null; // Reject arbitrary zip
        }
        // 6. Text / Markdown / CSV: verify valid UTF-8 without binary null bytes
        if (isTextFile(bytes)) {
            String text = new String(bytes, 0, Math.min(bytes.length, 1024), StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
            if (text.contains("<svg") || text.contains("<!doctype html") || text.contains("<html")) {
                return null; // Reject disguised SVG or HTML
            }
            if ("md".equals(ext)) return "text/markdown";
            if ("csv".equals(ext)) return "text/csv";
            return "text/plain";
        }

        return null;
    }

    private boolean isTextFile(byte[] bytes) {
        int checkLen = Math.min(bytes.length, 1024);
        for (int i = 0; i < checkLen; i++) {
            byte b = bytes[i];
            if (b == 0) {
                return false; // Binary null byte
            }
        }
        return true;
    }

    private boolean isDocxArchive(byte[] bytes) {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().startsWith("word/")) {
                    return true;
                }
            }
        } catch (Exception e) {
            return false;
        }
        return false;
    }

    private String getFileExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        if (idx > 0 && idx < filename.length() - 1) {
            return filename.substring(idx + 1);
        }
        return "";
    }

    private String computeSha256(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(bytes);
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 digest unavailable", e);
        }
    }
}
