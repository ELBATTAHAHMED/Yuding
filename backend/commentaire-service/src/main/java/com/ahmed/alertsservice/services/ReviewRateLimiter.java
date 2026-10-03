package com.ahmed.alertsservice.services;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/** PostgreSQL transaction lock makes the per-user hourly limit safe across service instances. */
@Component
public class ReviewRateLimiter {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public ReviewRateLimiter(JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(transactionManager);
        this.transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void record(UUID userId) {
        Boolean allowed = transactions.execute(status -> {
            jdbc.query("select pg_advisory_xact_lock(hashtext(?))", rs -> { }, userId.toString());
            Integer attempts = jdbc.queryForObject(
                    "select count(*) from engagement.review_attempts where user_id = ? and attempted_at > now() - interval '1 hour'",
                    Integer.class, userId);
            if (attempts != null && attempts >= 5) return false;
            jdbc.update("insert into engagement.review_attempts (user_id) values (?)", userId);
            return true;
        });
        if (!Boolean.TRUE.equals(allowed)) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Limite de cinq tentatives d'avis par heure atteinte.");
    }
}
