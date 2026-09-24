package com.ahmed.aiservice.domain.attachment.service;

import com.ahmed.aiservice.config.AiProperties;
import com.ahmed.aiservice.exception.AiProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AttachmentSafetyServiceTest {

    private AttachmentSafetyService safetyService;

    @BeforeEach
    void setUp() {
        AiProperties properties = new AiProperties();
        safetyService = new AttachmentSafetyService(properties);
    }

    @Test
    @DisplayName("Accept valid PNG image with correct magic bytes")
    void validate_validPng_accepted() {
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        AttachmentSafetyService.ValidatedFile result = safetyService.validateAndInspect("screenshot.png", "image/png", pngHeader);

        assertThat(result.mimeType()).isEqualTo("image/png");
        assertThat(result.kind()).isEqualTo("IMAGE");
        assertThat(result.originalFilename()).isEqualTo("screenshot.png");
    }

    @Test
    @DisplayName("Accept valid JPEG image with correct magic bytes")
    void validate_validJpeg_accepted() {
        byte[] jpegHeader = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0};
        AttachmentSafetyService.ValidatedFile result = safetyService.validateAndInspect("ticket.jpg", "image/jpeg", jpegHeader);

        assertThat(result.mimeType()).isEqualTo("image/jpeg");
        assertThat(result.kind()).isEqualTo("IMAGE");
    }

    @Test
    @DisplayName("Accept valid PDF document with %PDF- header")
    void validate_validPdf_accepted() {
        byte[] pdfHeader = "%PDF-1.4\n%test content\n".getBytes(StandardCharsets.UTF_8);
        AttachmentSafetyService.ValidatedFile result = safetyService.validateAndInspect("reservation.pdf", "application/pdf", pdfHeader);

        assertThat(result.mimeType()).isEqualTo("application/pdf");
        assertThat(result.kind()).isEqualTo("DOCUMENT");
    }

    @Test
    @DisplayName("Accept valid plain text document")
    void validate_validPlainText_accepted() {
        byte[] textBytes = "Vol Casablanca vers Paris AF1497".getBytes(StandardCharsets.UTF_8);
        AttachmentSafetyService.ValidatedFile result = safetyService.validateAndInspect("notes.txt", "text/plain", textBytes);

        assertThat(result.mimeType()).isEqualTo("text/plain");
        assertThat(result.kind()).isEqualTo("DOCUMENT");
    }

    @Test
    @DisplayName("Reject SVG file due to XSS risk")
    void validate_svg_rejected() {
        byte[] svgBytes = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> safetyService.validateAndInspect("image.svg", "image/svg+xml", svgBytes))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining(".svg");
    }

    @Test
    @DisplayName("Reject HTML disguised as text or image")
    void validate_html_rejected() {
        byte[] htmlBytes = "<html><head><title>Test</title></head><body><h1>Phishing</h1></body></html>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> safetyService.validateAndInspect("test.html", "text/html", htmlBytes))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining(".html");
    }

    @Test
    @DisplayName("Reject executable binary disguised as image (MIME spoofing)")
    void validate_spoofedBinary_rejected() {
        // Windows PE header MZ
        byte[] exeBytes = new byte[]{0x4D, 0x5A, (byte) 0x90, 0x00, 0x03, 0x00, 0x00, 0x00};

        assertThatThrownBy(() -> safetyService.validateAndInspect("photo.png", "image/png", exeBytes))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("ne correspond pas au contenu");
    }

    @Test
    @DisplayName("Sanitize dangerous characters in filename")
    void validate_filenameSanitization() {
        byte[] textBytes = "Itinéraire de test".getBytes(StandardCharsets.UTF_8);
        AttachmentSafetyService.ValidatedFile result = safetyService.validateAndInspect("../../etc/passwd.txt", "text/plain", textBytes);

        assertThat(result.originalFilename()).doesNotContain("..");
        assertThat(result.originalFilename()).doesNotContain("/");
        assertThat(result.originalFilename()).doesNotContain("\\");
        assertThat(result.originalFilename()).isEqualTo("passwd.txt");
    }

    @Test
    @DisplayName("Reject file exceeding size limit")
    void validate_oversizedFile_rejected() {
        // Mock 11MB file (exceeds 10MB document limit)
        byte[] oversized = new byte[11 * 1024 * 1024];
        oversized[0] = '%'; oversized[1] = 'P'; oversized[2] = 'D'; oversized[3] = 'F'; oversized[4] = '-';

        assertThatThrownBy(() -> safetyService.validateAndInspect("huge.pdf", "application/pdf", oversized))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("limite maximale");
    }
}
