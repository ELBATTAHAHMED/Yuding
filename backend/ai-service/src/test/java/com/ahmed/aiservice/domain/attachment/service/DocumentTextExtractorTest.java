package com.ahmed.aiservice.domain.attachment.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentTextExtractorTest {

    private DocumentTextExtractor extractor;

    @BeforeEach
    void setUp() {
        extractor = new DocumentTextExtractor();
    }

    @Test
    @DisplayName("Extract plain text content")
    void extractText_plainText() {
        String content = "Confirmation de réservation vol AT780 Casablanca -> Paris";
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

        String result = extractor.extractText(bytes, "text/plain");

        assertThat(result).isEqualTo(content);
    }

    @Test
    @DisplayName("Extract CSV content")
    void extractText_csv() {
        String csv = "Jour,Activité,Prix\n1,Louvre,200\n2,Versailles,300";
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);

        String result = extractor.extractText(bytes, "text/csv");

        assertThat(result).isEqualTo(csv);
    }

    @Test
    @DisplayName("Extract text from genuine PDF")
    void extractText_pdf() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(doc, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                contentStream.newLineAtOffset(100, 700);
                contentStream.showText("Yuding Trip Confirmation: YUD-12345");
                contentStream.endText();
            }
            doc.save(baos);
        }

        String result = extractor.extractText(baos.toByteArray(), "application/pdf");

        assertThat(result).contains("Yuding Trip Confirmation: YUD-12345");
    }

    @Test
    @DisplayName("Truncate text exceeding limit safely")
    void extractText_truncation() {
        String hugeText = "A".repeat(60_000);
        byte[] bytes = hugeText.getBytes(StandardCharsets.UTF_8);

        String result = extractor.extractText(bytes, "text/plain");

        assertThat(result.length()).isLessThan(60_000);
        assertThat(result).contains("tronqué à 50 000 caractères");
    }
}
