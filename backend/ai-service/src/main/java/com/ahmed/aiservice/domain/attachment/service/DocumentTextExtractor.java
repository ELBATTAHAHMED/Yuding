package com.ahmed.aiservice.domain.attachment.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@Slf4j
public class DocumentTextExtractor {

    private static final int MAX_EXTRACTED_CHARS = 50_000;
    private static final int MAX_PDF_PAGES = 10;

    public String extractText(byte[] bytes, String mimeType) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }

        try {
            if ("application/pdf".equals(mimeType)) {
                return extractPdfText(bytes);
            } else if ("application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(mimeType)) {
                return extractDocxText(bytes);
            } else {
                // Text / Markdown / CSV
                return extractPlainText(bytes);
            }
        } catch (Exception e) {
            log.warn("Failed to extract text from document (mime={}): {}", mimeType, e.getMessage());
            return "[Erreur lors de l'extraction du texte de ce document]";
        }
    }

    private String extractPlainText(byte[] bytes) {
        String text = new String(bytes, StandardCharsets.UTF_8);
        if (text.length() > MAX_EXTRACTED_CHARS) {
            return text.substring(0, MAX_EXTRACTED_CHARS) + "\n\n[... document tronqué à 50 000 caractères]";
        }
        return text;
    }

    private String extractPdfText(byte[] bytes) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            int totalPages = doc.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(MAX_PDF_PAGES, totalPages));
            String text = stripper.getText(doc).trim();

            if (text.isBlank()) {
                return "[Ce document PDF ne contient pas de texte extractible direct (document numérisé/image scannée).]";
            }

            if (totalPages > MAX_PDF_PAGES) {
                text += "\n\n[... document PDF tronqué: seules les " + MAX_PDF_PAGES + " premières pages sur " + totalPages + " ont été extraites]";
            }

            if (text.length() > MAX_EXTRACTED_CHARS) {
                text = text.substring(0, MAX_EXTRACTED_CHARS) + "\n\n[... texte tronqué à 50 000 caractères]";
            }

            return text;
        } catch (Exception e) {
            log.warn("PDFBox extraction failed: {}", e.getMessage());
            return "[Impossible d'extraire le texte de ce fichier PDF]";
        }
    }

    private String extractDocxText(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    XMLInputFactory factory = XMLInputFactory.newFactory();
                    // Secure XML parser configuration against XXE
                    factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, Boolean.FALSE);
                    factory.setProperty(XMLInputFactory.SUPPORT_DTD, Boolean.FALSE);

                    XMLStreamReader reader = factory.createXMLStreamReader(zis);
                    while (reader.hasNext()) {
                        int event = reader.next();
                        if (event == XMLStreamConstants.CHARACTERS) {
                            sb.append(reader.getText());
                            if (sb.length() >= MAX_EXTRACTED_CHARS) {
                                sb.append("\n\n[... document Word tronqué à 50 000 caractères]");
                                break;
                            }
                        } else if (event == XMLStreamConstants.END_ELEMENT && "p".equals(reader.getLocalName())) {
                            sb.append("\n");
                        }
                    }
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("DOCX XML extraction failed: {}", e.getMessage());
            return "[Erreur lors de la lecture du document Word DOCX]";
        }

        String result = sb.toString().trim();
        return result.isBlank() ? "[Document Word sans texte détecté]" : result;
    }
}
