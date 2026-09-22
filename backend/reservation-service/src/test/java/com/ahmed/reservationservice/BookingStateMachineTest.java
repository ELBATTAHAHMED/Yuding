package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.exception.InvalidBookingTransitionException;
import com.ahmed.reservationservice.domain.model.BookingLifecycle;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Exhaustive 9x9 State Transition Matrix Test Suite for Yuding V2 Booking Lifecycle.
 * Verifies all 81 transition permutations, terminal states, and expiration rules.
 */
class BookingStateMachineTest {

    private static final Map<BookingStatus, Set<BookingStatus>> EXPECTED_ALLOWED = Map.of(
            BookingStatus.DRAFT, Set.of(
                    BookingStatus.PENDING_PAYMENT,
                    BookingStatus.CANCELLED,
                    BookingStatus.EXPIRED
            ),
            BookingStatus.PENDING_PAYMENT, Set.of(
                    BookingStatus.PAID,
                    BookingStatus.PAYMENT_FAILED,
                    BookingStatus.CANCELLED,
                    BookingStatus.EXPIRED
            ),
            BookingStatus.PAYMENT_FAILED, Set.of(
                    BookingStatus.PENDING_PAYMENT,
                    BookingStatus.CANCELLED,
                    BookingStatus.EXPIRED
            ),
            BookingStatus.PAID, Set.of(
                    BookingStatus.PENDING_PROVIDER_CONFIRMATION,
                    BookingStatus.REFUNDED
            ),
            BookingStatus.PENDING_PROVIDER_CONFIRMATION, Set.of(
                    BookingStatus.CONFIRMED,
                    BookingStatus.REFUNDED
            ),
            BookingStatus.CONFIRMED, Set.of(
                    BookingStatus.CANCELLED
            ),
            BookingStatus.CANCELLED, Set.of(
                    BookingStatus.REFUNDED
            ),
            BookingStatus.REFUNDED, Set.of(),
            BookingStatus.EXPIRED, Set.of()
    );

    @Test
    @DisplayName("Verify all 9 statuses are present in the lifecycle enum")
    void allNineStatuses_exist() {
        BookingStatus[] statuses = BookingStatus.values();
        assertThat(statuses).containsExactlyInAnyOrder(
                BookingStatus.DRAFT,
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.PAYMENT_FAILED,
                BookingStatus.PAID,
                BookingStatus.PENDING_PROVIDER_CONFIRMATION,
                BookingStatus.CONFIRMED,
                BookingStatus.CANCELLED,
                BookingStatus.REFUNDED,
                BookingStatus.EXPIRED
        );
    }

    @Test
    @DisplayName("Exhaustive 9x9 matrix test: verify every allowed and forbidden transition")
    void exhaustiveTransitionMatrix_verified() {
        for (BookingStatus from : BookingStatus.values()) {
            Set<BookingStatus> allowedTargets = EXPECTED_ALLOWED.get(from);

            for (BookingStatus to : BookingStatus.values()) {
                boolean expectedAllowed = allowedTargets.contains(to);
                boolean actualAllowed = BookingLifecycle.canTransition(from, to);

                assertThat(actualAllowed)
                        .as("Transition from %s to %s should be %s", from, to, expectedAllowed ? "ALLOWED" : "FORBIDDEN")
                        .isEqualTo(expectedAllowed);

                if (expectedAllowed) {
                    assertThatCode(() -> BookingLifecycle.validateTransition(from, to))
                            .doesNotThrowAnyException();
                } else {
                    assertThatThrownBy(() -> BookingLifecycle.validateTransition(from, to))
                            .isInstanceOf(InvalidBookingTransitionException.class)
                            .hasMessageContaining(from.name())
                            .hasMessageContaining(to.name());
                }
            }
        }
    }

    @Test
    @DisplayName("Terminal states (REFUNDED, EXPIRED) reject all transitions")
    void terminalStates_rejectAllTransitions() {
        assertThat(BookingStatus.REFUNDED.isTerminal()).isTrue();
        assertThat(BookingStatus.EXPIRED.isTerminal()).isTrue();

        for (BookingStatus target : BookingStatus.values()) {
            assertThat(BookingLifecycle.canTransition(BookingStatus.REFUNDED, target)).isFalse();
            assertThat(BookingLifecycle.canTransition(BookingStatus.EXPIRED, target)).isFalse();
        }
    }

    @Test
    @DisplayName("Non-terminal states return isTerminal() == false")
    void nonTerminalStates_notTerminal() {
        assertThat(BookingStatus.DRAFT.isTerminal()).isFalse();
        assertThat(BookingStatus.PENDING_PAYMENT.isTerminal()).isFalse();
        assertThat(BookingStatus.PAYMENT_FAILED.isTerminal()).isFalse();
        assertThat(BookingStatus.PAID.isTerminal()).isFalse();
        assertThat(BookingStatus.PENDING_PROVIDER_CONFIRMATION.isTerminal()).isFalse();
        assertThat(BookingStatus.CONFIRMED.isTerminal()).isFalse();
        assertThat(BookingStatus.CANCELLED.isTerminal()).isFalse();
    }

    @Test
    @DisplayName("canExpire() is true only for DRAFT, PENDING_PAYMENT, PAYMENT_FAILED")
    void canExpire_onlyEarlyStates() {
        assertThat(BookingStatus.DRAFT.canExpire()).isTrue();
        assertThat(BookingStatus.PENDING_PAYMENT.canExpire()).isTrue();
        assertThat(BookingStatus.PAYMENT_FAILED.canExpire()).isTrue();

        assertThat(BookingStatus.PAID.canExpire()).isFalse();
        assertThat(BookingStatus.PENDING_PROVIDER_CONFIRMATION.canExpire()).isFalse();
        assertThat(BookingStatus.CONFIRMED.canExpire()).isFalse();
        assertThat(BookingStatus.CANCELLED.canExpire()).isFalse();
        assertThat(BookingStatus.REFUNDED.canExpire()).isFalse();
        assertThat(BookingStatus.EXPIRED.canExpire()).isFalse();
    }

    @ParameterizedTest
    @EnumSource(BookingStatus.class)
    @DisplayName("Self-transitions (from == to) are always rejected")
    void selfTransitions_areForbidden(BookingStatus status) {
        assertThat(BookingLifecycle.canTransition(status, status)).isFalse();
        assertThatThrownBy(() -> BookingLifecycle.validateTransition(status, status))
                .isInstanceOf(InvalidBookingTransitionException.class);
    }
}
