package com.ahmed.alertsservice.services;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.regex.Pattern;

/** Deterministic input rules; link-bearing reviews await a human moderation decision. */
final class ReviewContentPolicy {
    private static final Pattern LINK = Pattern.compile("(?i)(https?://|www\\.|\\b[a-z0-9-]+\\.(com|net|org|io)\\b)");
    private static final Pattern HTML = Pattern.compile("[<>]");
    record Validated(int rating, String content, String status) { }

    static Validated validate(ReviewService.ReviewInput input) {
        if (input == null || input.rating() < 1 || input.rating() > 5)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La note doit être entre 1 et 5.");
        String content = input.content() == null ? "" : input.content().trim();
        if (content.length() > 1200 || HTML.matcher(content).find())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Texte trop long ou balises interdites.");
        if (!content.isEmpty()) {
            String letters = content.replaceAll("[^\\p{L}\\p{N}]", "").toLowerCase(Locale.ROOT);
            if (letters.length() < 10 || letters.matches("(.)\\1{7,}") || content.matches("(?s).*(.{4,})\\1{3,}.*"))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Décrivez votre expérience avec un texte utile.");
        }
        return new Validated(input.rating(), content, LINK.matcher(content).find() ? "PENDING_MODERATION" : "APPROVED");
    }
    private ReviewContentPolicy() { }
}
