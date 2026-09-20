package com.ahmed.identityservice.repository;

import com.ahmed.identityservice.model.RefreshToken;
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
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.userId = :userId AND rt.revokedAt IS NULL AND rt.expiresAt > :now ORDER BY rt.lastUsedAt DESC")
    List<RefreshToken> findActiveTokensByUserId(@Param("userId") UUID userId, @Param("now") Instant now);

    List<RefreshToken> findByUserIdAndSessionId(UUID userId, UUID sessionId);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :revokedAt, rt.revocationReason = :reason WHERE rt.userId = :userId AND rt.revokedAt IS NULL")
    int revokeAllActiveTokensForUserWithReason(@Param("userId") UUID userId, @Param("revokedAt") Instant revokedAt, @Param("reason") String reason);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :revokedAt WHERE rt.userId = :userId AND rt.revokedAt IS NULL")
    default int revokeAllActiveTokensForUser(UUID userId, Instant revokedAt) {
        return revokeAllActiveTokensForUserWithReason(userId, revokedAt, "LOGOUT_ALL");
    }

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :revokedAt, rt.revocationReason = :reason WHERE rt.userId = :userId AND rt.sessionId = :sessionId AND rt.revokedAt IS NULL")
    int revokeSessionForUser(@Param("userId") UUID userId, @Param("sessionId") UUID sessionId, @Param("revokedAt") Instant revokedAt, @Param("reason") String reason);
}
