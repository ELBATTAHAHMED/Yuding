package com.ahmed.alertsservice;

import com.ahmed.alertsservice.services.ReviewRateLimiter;
import com.ahmed.alertsservice.services.ReviewService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

    @Test void featuredFeedOnlyContainsApprovedVerifiedReviews() {
        UUID user = UUID.randomUUID();
        UUID approved = insert(user, UUID.randomUUID(), "APPROVED", 5);
        jdbc.update("update engagement.reviews set public_display_name = 'Lina Benali' where id = ?", approved);
        insert(user, UUID.randomUUID(), "PENDING_MODERATION", 4);
        UUID unverified = insert(user, UUID.randomUUID(), "APPROVED", 3);
        jdbc.update("update engagement.reviews set is_verified_purchase = false where id = ?", unverified);
        assertThat(reviews.featuredReviews()).anyMatch(review -> review.rating() == 5
                && review.entityName().equals("Hôtel") && review.displayName().equals("Lina Benali"));
        assertThat(reviews.featuredReviews().stream().filter(review -> review.entityName().equals("Hôtel")
                && review.content().equals("Très bon séjour de test")).toList()).allMatch(review -> review.rating() == 5);
        jdbc.update("update engagement.reviews set status = 'DELETED' where id = ?", approved);
        assertThat(reviews.featuredReviews().stream().filter(review -> review.entityName().equals("Hôtel")
                && review.content().equals("Très bon séjour de test")).toList()).isEmpty();
    }

    @Test void platformReviewIsUniquePerAuthorAndAppearsInTheirList() {
        UUID user = UUID.randomUUID();
        Jwt owner = Jwt.withTokenValue("test-token").header("alg", "RS256").subject(user.toString()).build();
        var created = reviews.createPlatform(new ReviewService.ReviewInput(5,
                "Une excellente expérience avec Yuding."), owner);
        assertThat(created.entityType()).isEqualTo("PLATFORM");
        assertThat(created.bookingReference()).isNull();
        assertThat(reviews.platformMine(user).id()).isEqualTo(created.id());
        assertThat(reviews.mineAll(user)).extracting(ReviewService.Review::id).contains(created.id());
        assertThat(reviews.mineAll(UUID.randomUUID())).isEmpty();
        assertThatThrownBy(() -> reviews.createPlatform(new ReviewService.ReviewInput(4,
                "Une autre expérience avec Yuding."), owner))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("409");
    }

    @Test void deletedPlatformReviewNoLongerBlocksAnotherReview() {
        UUID user = UUID.randomUUID();
        Jwt owner = Jwt.withTokenValue("test-token").header("alg", "RS256").subject(user.toString()).build();
        var first = reviews.createPlatform(new ReviewService.ReviewInput(5, "Une excellente expérience sur Yuding."), owner);
        reviews.delete(first.id(), user);
        assertThat(reviews.platformMine(user)).isNull();
        var replacement = reviews.createPlatform(new ReviewService.ReviewInput(4, "Une expérience renouvelée sur Yuding."), owner);
        assertThat(replacement.id()).isNotEqualTo(first.id());
        assertThat(reviews.platformMine(user).id()).isEqualTo(replacement.id());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCOMMODATION", "FLIGHT", "ACTIVITY", "TRANSFER", "TRAIN"})
    void eachCompletedBookingTypePersistsAndPublishesItsVerifiedReview(String type) {
        String reference = "offer-" + type.toLowerCase();
        UUID id = jdbc.queryForObject("""
                insert into engagement.reviews
                (user_id, booking_id, item_type, provider, item_reference, rating, content, title, is_verified_purchase, status)
                values (?, ?, ?, 'TEST', ?, 5, 'Une expérience de voyage appréciée.', ?, true, 'APPROVED') returning id
                """, UUID.class, UUID.randomUUID(), UUID.randomUUID(), type, reference, "Voyage " + type);
        assertThat(id).isNotNull();
        assertThat(reviews.publicReviews(type, "TEST", reference).reviewCount()).isEqualTo(1);
        assertThat(reviews.featuredReviews()).anyMatch(review -> review.entityType().equals(type)
                && review.entityName().equals("Voyage " + type) && review.verifiedBooking());
    }
}
