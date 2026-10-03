package com.ahmed.alertsservice;

import com.ahmed.alertsservice.services.ReviewRateLimiter;
import com.ahmed.alertsservice.services.ReviewService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
@TestPropertySource(properties = {"spring.cloud.config.enabled=false", "eureka.client.enabled=false"})
class ReviewPersistenceIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ReviewService reviews;
    @MockBean ReviewRateLimiter limiter;

    private UUID insert(UUID user, UUID booking, String status, int rating) {
        return jdbc.queryForObject("""
                insert into engagement.reviews
                (user_id, booking_id, item_type, provider, item_reference, rating, content, title, is_verified_purchase, status)
                values (?, ?, 'ACCOMMODATION', 'NUITEE', 'hotel-test-phase52', ?, 'Très bon séjour de test', 'Hôtel', true, ?)
                returning id
                """, UUID.class, user, booking, rating, status);
    }

    @Test void oneBookingCannotCreateTwoReviewsEvenConcurrently() {
        UUID user = UUID.randomUUID();
        UUID booking = UUID.randomUUID();
        insert(user, booking, "APPROVED", 5);
        assertThatThrownBy(() -> insert(user, booking, "APPROVED", 4))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void onlyPublishedReviewsContributeToPublicRatingAndForeignOwnersCannotDelete() {
        UUID user = UUID.randomUUID();
        UUID first = insert(user, UUID.randomUUID(), "APPROVED", 5);
        insert(user, UUID.randomUUID(), "APPROVED", 3);
        insert(user, UUID.randomUUID(), "PENDING_MODERATION", 1);
        var publicData = reviews.publicReviews("ACCOMMODATION", "NUITEE", "hotel-test-phase52");
        assertThat(publicData.reviewCount()).isEqualTo(2);
        assertThat(publicData.averageRating()).isEqualTo(4.0);
        assertThat(publicData.reviews()).allMatch(review -> review.displayName().equals("Voyageur vérifié"));
        assertThatThrownBy(() -> reviews.delete(first, UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        Jwt stranger = Jwt.withTokenValue("test-token").header("alg", "RS256")
                .subject(UUID.randomUUID().toString()).build();
        assertThatThrownBy(() -> reviews.edit(first, new ReviewService.ReviewInput(4, "Une expérience correcte."), stranger))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
    }

    @Test void editingRechecksModerationAndDeletionRemovesPublicContribution() {
        UUID user = UUID.randomUUID();
        UUID id = insert(user, UUID.randomUUID(), "APPROVED", 5);
        Jwt owner = Jwt.withTokenValue("test-token").header("alg", "RS256").subject(user.toString()).build();
        var edited = reviews.edit(id, new ReviewService.ReviewInput(4,
                "Très bon voyage, les photos sont sur https://example.com"), owner);
        assertThat(edited.status()).isEqualTo("PENDING_MODERATION");
        assertThat(reviews.publicReviews("ACCOMMODATION", "NUITEE", "hotel-test-phase52").reviewCount()).isZero();
        reviews.delete(id, user);
        assertThatThrownBy(() -> reviews.edit(id, new ReviewService.ReviewInput(5, "Un séjour vraiment agréable."), owner))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("409");
    }
}
