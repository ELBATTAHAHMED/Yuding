package com.ahmed.reservationservice.domain.idempotency;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, UUID> {

    Optional<IdempotencyRecord> findByActorUserIdAndOperationAndIdempotencyKeyHash(
            UUID actorUserId,
            String operation,
            String idempotencyKeyHash
    );

    Optional<IdempotencyRecord> findByOperationAndIdempotencyKeyHashAndActorUserIdIsNull(
            String operation,
            String idempotencyKeyHash
    );
}
