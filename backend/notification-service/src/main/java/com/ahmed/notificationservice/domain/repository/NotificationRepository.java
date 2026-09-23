package com.ahmed.notificationservice.domain.repository;

import com.ahmed.notificationservice.domain.model.Notification;
import com.ahmed.notificationservice.domain.model.NotificationEventType;
import com.ahmed.notificationservice.domain.model.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Optional<Notification> findByNotificationReference(String notificationReference);

    Optional<Notification> findByEventTypeAndIdempotencyKeyHash(
            NotificationEventType eventType, String idempotencyKeyHash);

    boolean existsByNotificationReference(String notificationReference);

    @Query(value = "SELECT id FROM notification.notifications " +
            "WHERE status IN ('PENDING', 'RETRY_SCHEDULED') " +
            "AND (next_attempt_at IS NULL OR next_attempt_at <= :now) " +
            "ORDER BY COALESCE(next_attempt_at, created_at) ASC " +
            "LIMIT :limit FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<UUID> claimDueNotificationIds(@Param("now") Instant now, @Param("limit") int limit);

    @Query("SELECT n FROM Notification n WHERE n.status = :status AND n.lastAttemptAt < :threshold")
    List<Notification> findStaleProcessing(
            @Param("status") NotificationStatus status,
            @Param("threshold") Instant threshold);

    List<Notification> findByBookingReference(String bookingReference);
}
