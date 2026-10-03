package com.ahmed.alertsservice.services;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.*;

class ReviewContentPolicyTest {
    @Test void validRatingOnlyReviewCanPublish() {
        var value = ReviewContentPolicy.validate(new ReviewService.ReviewInput(5, ""));
        assertThat(value.status()).isEqualTo("APPROVED");
    }

    @Test void invalidRatingAndAbusivePayloadAreRejected() {
        assertThatThrownBy(() -> ReviewContentPolicy.validate(new ReviewService.ReviewInput(0, "Excellent voyage")))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> ReviewContentPolicy.validate(new ReviewService.ReviewInput(5, "<script>alert(1)</script>")))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> ReviewContentPolicy.validate(new ReviewService.ReviewInput(5, "Super super super super super")))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> ReviewContentPolicy.validate(new ReviewService.ReviewInput(5, "x".repeat(1201))))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test void linkBearingReviewIsPendingNotPublic() {
        var value = ReviewContentPolicy.validate(new ReviewService.ReviewInput(4,
                "Le séjour était agréable. Voir https://example.com pour les photos."));
        assertThat(value.status()).isEqualTo("PENDING_MODERATION");
    }
}
