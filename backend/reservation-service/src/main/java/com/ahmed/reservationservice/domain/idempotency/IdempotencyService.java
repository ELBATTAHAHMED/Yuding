package com.ahmed.reservationservice.domain.idempotency;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletResponse;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Authoritative transactional coordinator for idempotent mutations.
 * Manages database claims, concurrent deduplication, deterministic request fingerprinting,
 * and safe canonical response replays.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private static final Duration DEFAULT_RETENTION = Duration.ofHours(72);
    private static final int MAX_WAIT_ATTEMPTS = 5;
    private static final long WAIT_INTERVAL_MS = 300;

    private final IdempotencyRecordRepository recordRepository;
    private final IdempotencyValidator validator;
    private final IdempotencyHasher hasher;
    private final ObjectMapper objectMapper;
    private final Clock clock = Clock.systemUTC();

    /**
     * Executes an operation with strict end-to-end idempotency protection.
     *
     * @param operation      Logical operation type
     * @param actorUserId    Authenticated user ID (or null for public actions)
     * @param resourceScope  Optional resource identifier (e.g. bookingReference)
     * @param rawKey         Raw Idempotency-Key header value
     * @param requestPayload Canonical request inputs to fingerprint
     * @param responseType   Class of the response payload for replay deserialization
     * @param supplier       The business operation to execute if claiming succeeds
     * @param refExtractor   Function extracting public reference from response
     * @param successStatus  HTTP status on success
     * @param <T>            Response type
     * @return Execution result (either freshly executed or replayed from persistent storage)
     */
    public <T> T execute(
            IdempotencyOperation operation,
            UUID actorUserId,
            String resourceScope,
            String rawKey,
            Object requestPayload,
            Class<T> responseType,
            Supplier<T> supplier,
            java.util.function.Function<T, String> refExtractor,
            int successStatus) {

        validator.validate(rawKey);

        String keyHash = hasher.hashKey(rawKey);
        String requestHash = hasher.computeRequestFingerprint(operation.name(), actorUserId, resourceScope, requestPayload);

        // Attempt to claim execution in a dedicated short transaction
        ClaimResult claimResult = claimExecution(operation, actorUserId, resourceScope, keyHash, requestHash);

        if (claimResult.isReplay()) {
            IdempotencyRecord record = claimResult.getRecord();
            log.info("Idempotency: Replaying completed [{}] operation for actor [{}] scope [{}] (ref={})",
                    operation, actorUserId, resourceScope, record.getResourceReference());
            setReplayedHeader();
            return deserializeResponse(record.getResponsePayload(), responseType);
        }

        UUID recordId = claimResult.getRecord().getId();
        T result;
        try {
            // Execute business logic (outside of the claim transaction)
            result = supplier.get();
        } catch (RuntimeException ex) {
            log.warn("Idempotency: Operation [{}] failed for actor [{}] scope [{}]: {}",
                    operation, actorUserId, resourceScope, ex.getMessage());
            markFailed(recordId, IdempotencyStatus.FAILED_RETRYABLE, 500, ex.getMessage());
            throw ex;
        }

        // Complete the idempotency record in a dedicated short transaction
        String resourceRef = (refExtractor != null && result != null) ? refExtractor.apply(result) : null;
        completeExecution(recordId, successStatus, result, resourceRef);
        return result;
    }

    /**
     * Claims execution rights in the database.
     * Uses REQUIRES_NEW to isolate the lock/claim from long external provider calls.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ClaimResult claimExecution(
            IdempotencyOperation operation,
            UUID actorUserId,
            String resourceScope,
            String keyHash,
            String requestHash) {

        Instant now = Instant.now(clock);
        Instant expiresAt = now.plus(DEFAULT_RETENTION);

        for (int attempt = 0; attempt < MAX_WAIT_ATTEMPTS; attempt++) {
            Optional<IdempotencyRecord> existingOpt = findExistingRecord(actorUserId, operation.name(), keyHash);

            if (existingOpt.isPresent()) {
                IdempotencyRecord existing = existingOpt.get();

                // 1. Conflict detection: Same key but different request fingerprint
                if (!existing.getRequestHash().equals(requestHash)) {
                    log.warn("Idempotency: Key reused with mismatched request payload for actor [{}] operation [{}]",
                            actorUserId, operation);
                    throw new IdempotencyConflictException(
                            "IDEMPOTENCY_KEY_REUSED",
                            "This Idempotency-Key has already been used with different request parameters."
                    );
                }

                // 2. Already completed: return replay
                if (existing.getStatus() == IdempotencyStatus.COMPLETED) {
                    return ClaimResult.replay(existing);
                }

                // 3. In progress: if concurrent request, wait briefly
                if (existing.getStatus() == IdempotencyStatus.IN_PROGRESS) {
                    try {
                        Thread.sleep(WAIT_INTERVAL_MS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new IdempotencyConflictException(
                                "IDEMPOTENCY_IN_PROGRESS",
                                "Concurrent request processing was interrupted. Please retry shortly."
                        );
                    }
                    continue;
                }

                // 4. Retryable failure: reclaim record
                if (existing.getStatus() == IdempotencyStatus.FAILED_RETRYABLE) {
                    existing.setStatus(IdempotencyStatus.IN_PROGRESS);
                    existing.setRequestHash(requestHash);
                    existing.setExpiresAt(expiresAt);
                    IdempotencyRecord saved = recordRepository.save(existing);
                    return ClaimResult.newClaim(saved);
                }

                // 5. Final failure
                throw new IdempotencyConflictException(
                        "IDEMPOTENCY_OPERATION_FAILED",
                        "The previous operation with this Idempotency-Key failed permanently: " + existing.getResponsePayload()
                );
            }

            // Record does not exist: attempt insertion
            IdempotencyRecord newRecord = IdempotencyRecord.builder()
                    .actorUserId(actorUserId)
                    .operation(operation.name())
                    .resourceScope(resourceScope)
                    .idempotencyKeyHash(keyHash)
                    .requestHash(requestHash)
                    .status(IdempotencyStatus.IN_PROGRESS)
                    .createdAt(now)
                    .expiresAt(expiresAt)
                    .build();

            try {
                IdempotencyRecord saved = recordRepository.saveAndFlush(newRecord);
                log.info("Idempotency: Claimed execution for [{}] actor [{}] scope [{}]",
                        operation, actorUserId, resourceScope);
                return ClaimResult.newClaim(saved);
            } catch (DataIntegrityViolationException ex) {
                // Concurrent race lost: another thread claimed it at the same millisecond
                log.info("Idempotency: Concurrent race detected for [{}] key [{}]", operation, keyHash);
                try {
                    Thread.sleep(WAIT_INTERVAL_MS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IdempotencyConflictException(
                            "IDEMPOTENCY_IN_PROGRESS",
                            "Concurrent request was interrupted. Please retry shortly."
                    );
                }
            }
        }

        // If loop exhausted and still in progress
        throw new IdempotencyConflictException(
                "IDEMPOTENCY_IN_PROGRESS",
                "An identical request is currently being processed. Please retry shortly."
        );
    }

    /**
     * Marks the claimed idempotency record as COMPLETED.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completeExecution(UUID recordId, int httpStatus, Object responseDto, String resourceReference) {
        IdempotencyRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalStateException("Idempotency record not found: " + recordId));

        Instant now = Instant.now(clock);
        String payloadJson = null;
        String responseHash = null;

        if (responseDto != null) {
            try {
                payloadJson = objectMapper.writeValueAsString(responseDto);
                responseHash = hasher.sha256(payloadJson);
            } catch (Exception e) {
                log.warn("Failed to serialize response payload for idempotency record [{}]: {}", recordId, e.getMessage());
            }
        }

        record.markCompleted(httpStatus, payloadJson, responseHash, resourceReference, now);
        recordRepository.save(record);
        log.info("Idempotency: Completed record [{}] with reference [{}] status [{}]",
                recordId, resourceReference, httpStatus);
    }

    /**
     * Marks the record as failed.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID recordId, IdempotencyStatus failureStatus, int httpStatus, String errorMessage) {
        recordRepository.findById(recordId).ifPresent(record -> {
            String errorPayload = null;
            if (errorMessage != null) {
                try {
                    errorPayload = objectMapper.writeValueAsString(java.util.Map.of("error", errorMessage));
                } catch (Exception e) {
                    errorPayload = "{\"error\":\"" + errorMessage.replace("\"", "\\\"") + "\"}";
                }
            }
            record.markFailed(failureStatus, httpStatus, errorPayload, Instant.now(clock));
            recordRepository.save(record);
        });
    }

    private Optional<IdempotencyRecord> findExistingRecord(UUID actorUserId, String operation, String keyHash) {
        if (actorUserId != null) {
            return recordRepository.findByActorUserIdAndOperationAndIdempotencyKeyHash(actorUserId, operation, keyHash);
        } else {
            return recordRepository.findByOperationAndIdempotencyKeyHashAndActorUserIdIsNull(operation, keyHash);
        }
    }

    private void setReplayedHeader() {
        try {
            RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes servletAttrs) {
                HttpServletResponse response = servletAttrs.getResponse();
                if (response != null) {
                    response.setHeader("Idempotent-Replayed", "true");
                }
            }
        } catch (Exception e) {
            log.debug("Unable to set Idempotent-Replayed header: {}", e.getMessage());
        }
    }

    private <T> T deserializeResponse(String payloadJson, Class<T> responseType) {
        if (payloadJson == null || responseType == Void.class) {
            return null;
        }
        try {
            return objectMapper.readValue(payloadJson, responseType);
        } catch (Exception e) {
            log.error("Failed to deserialize replayed idempotency response: {}", e.getMessage());
            throw new IllegalStateException("Unable to deserialize stored idempotency response", e);
        }
    }

    @lombok.Value
    public static class ClaimResult {
        IdempotencyRecord record;
        boolean replay;

        public static ClaimResult newClaim(IdempotencyRecord record) {
            return new ClaimResult(record, false);
        }

        public static ClaimResult replay(IdempotencyRecord record) {
            return new ClaimResult(record, true);
        }
    }
}
