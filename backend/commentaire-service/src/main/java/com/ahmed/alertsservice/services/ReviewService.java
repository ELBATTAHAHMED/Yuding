package com.ahmed.alertsservice.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import com.ahmed.alertsservice.services.ReviewContentPolicy.Validated;

@Service
public class ReviewService {
    public record Eligibility(String bookingReference, UUID bookingId, boolean eligible, String reason,
                              String entityType, String provider, String entityReference, String entityName) { }
    public record Review(UUID id, int rating, String content, String status, String entityType,
                         String provider, String entityReference, String entityName,
                         OffsetDateTime createdAt, OffsetDateTime updatedAt) { }
    public record PublicReview(int rating, String content, String displayName, OffsetDateTime createdAt) { }
    public record PublicReviews(Double averageRating, long reviewCount, List<PublicReview> reviews) { }
    public record ReviewInput(int rating, String content) { }

    private final JdbcTemplate jdbc;
    private final ReviewRateLimiter limiter;
    private final RestClient bookingClient;

    public ReviewService(JdbcTemplate jdbc, ReviewRateLimiter limiter,
                         @Value("${review.booking-base-url:http://localhost:8888}") String bookingBaseUrl) {
        this.jdbc = jdbc;
        this.limiter = limiter;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.bookingClient = RestClient.builder().baseUrl(bookingBaseUrl).requestFactory(requestFactory).build();
    }

    public Eligibility eligibility(String reference, Jwt jwt) {
        try {
            Eligibility result = bookingClient.get().uri("/bookings/{reference}/review-eligibility", reference)
                    .headers(headers -> headers.setBearerAuth(jwt.getTokenValue()))
                    .retrieve().body(Eligibility.class);
            if (result == null) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Éligibilité indisponible.");
            return result;
        } catch (HttpClientErrorException exception) {
            HttpStatus status = exception.getStatusCode().value() == 404 ? HttpStatus.NOT_FOUND
                    : exception.getStatusCode().value() == 401 ? HttpStatus.UNAUTHORIZED : HttpStatus.FORBIDDEN;
            throw new ResponseStatusException(status, "Dossier inaccessible.");
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Service de réservation indisponible.");
        }
    }

    public Review mine(UUID bookingId, UUID userId) {
        List<Review> reviews = jdbc.query("""
                select id, rating, content, status, item_type, provider, item_reference, coalesce(title, ''), created_at, updated_at
                from engagement.reviews where booking_id = ? and user_id = ?
                """, (rs, row) -> readReview(rs), bookingId, userId);
        return reviews.isEmpty() ? null : reviews.getFirst();
    }

    @Transactional
    public Review create(String reference, ReviewInput input, Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        limiter.record(userId);
        Eligibility target = eligibility(reference, jwt);
        if (!target.eligible()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce voyage n'est pas encore éligible à un avis.");
        Validated value = ReviewContentPolicy.validate(input);
        preventRepeatedContent(userId, value.content(), null);
        String title = target.entityName() == null ? null
                : target.entityName().substring(0, Math.min(150, target.entityName().length()));
        try {
            UUID id = jdbc.queryForObject("""
                    insert into engagement.reviews
                    (user_id, booking_id, item_type, provider, item_reference, rating, content, title, is_verified_purchase, status)
                    values (?, ?, ?, ?, ?, ?, ?, ?, true, ?) returning id
                    """, UUID.class, userId, target.bookingId(), target.entityType(), target.provider(),
                    target.entityReference(), value.rating(), value.content(), title, value.status());
            return owned(id, userId);
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un avis existe déjà pour ce dossier.");
        }
    }

    @Transactional
    public Review edit(UUID id, ReviewInput input, Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        limiter.record(userId);
        Review existing = owned(id, userId);
        if ("DELETED".equals(existing.status())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Avis supprimé.");
        Validated value = ReviewContentPolicy.validate(input);
        preventRepeatedContent(userId, value.content(), id);
        int updated = jdbc.update("""
                update engagement.reviews set rating = ?, content = ?, status = ?, updated_at = now()
                where id = ? and user_id = ? and status <> 'DELETED'
                """, value.rating(), value.content(), value.status(), id, userId);
        if (updated == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Avis supprimé.");
        return owned(id, userId);
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        owned(id, userId);
        jdbc.update("update engagement.reviews set status = 'DELETED', deleted_at = now(), updated_at = now() where id = ? and user_id = ?",
                id, userId);
    }

    public PublicReviews publicReviews(String type, String provider, String reference) {
        if (!List.of("ACCOMMODATION", "ACTIVITY").contains(type))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type non pris en charge.");
        List<PublicReview> reviews = jdbc.query("""
                select rating, content, created_at from engagement.reviews
                where item_type = ? and provider = ? and item_reference = ? and status = 'APPROVED'
                order by created_at desc limit 50
                """, (rs, row) -> new PublicReview(rs.getInt(1), rs.getString(2), "Voyageur vérifié",
                        rs.getObject(3, OffsetDateTime.class)), type, provider, reference);
        var summary = jdbc.queryForMap("""
                select count(*) as count, avg(rating)::float8 as average from engagement.reviews
                where item_type = ? and provider = ? and item_reference = ? and status = 'APPROVED'
                """, type, provider, reference);
        return new PublicReviews((Double) summary.get("average"), ((Number) summary.get("count")).longValue(), reviews);
    }

    @Transactional
    public void moderate(UUID id, String status) {
        if (!List.of("APPROVED", "REJECTED").contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Statut invalide.");
        int updated = jdbc.update("update engagement.reviews set status = ?, updated_at = now() where id = ? and status = 'PENDING_MODERATION'",
                status, id);
        if (updated == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Avis en attente introuvable.");
    }

    public List<Review> pending() {
        return jdbc.query("""
                select id, rating, content, status, item_type, provider, item_reference, coalesce(title, ''), created_at, updated_at
                from engagement.reviews where status = 'PENDING_MODERATION' order by created_at limit 100
                """, (rs, row) -> readReview(rs));
    }

    private Review owned(UUID id, UUID userId) {
        List<Review> reviews = jdbc.query("""
                select id, rating, content, status, item_type, provider, item_reference, coalesce(title, ''), created_at, updated_at
                from engagement.reviews where id = ? and user_id = ?
                """, (rs, row) -> readReview(rs), id, userId);
        if (reviews.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Avis introuvable.");
        return reviews.getFirst();
    }

    private void preventRepeatedContent(UUID userId, String content, UUID currentId) {
        if (content.isBlank()) return;
        Integer duplicates = jdbc.queryForObject("""
                select count(*) from engagement.reviews where user_id = ? and lower(trim(content)) = lower(?)
                and status <> 'DELETED' and (?::uuid is null or id <> ?::uuid)
                """, Integer.class, userId, content, currentId, currentId);
        if (duplicates != null && duplicates > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce texte a déjà été utilisé dans un autre avis.");
    }

    private static Review readReview(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Review((UUID) rs.getObject(1), rs.getInt(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8),
                rs.getObject(9, OffsetDateTime.class), rs.getObject(10, OffsetDateTime.class));
    }

}
