package com.ahmed.notificationservice.domain.repository;

import com.ahmed.notificationservice.domain.model.DeliveryAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryAttemptRepository extends JpaRepository<DeliveryAttempt, Long> {

    List<DeliveryAttempt> findByNotificationIdOrderByAttemptNumberAsc(UUID notificationId);
}
