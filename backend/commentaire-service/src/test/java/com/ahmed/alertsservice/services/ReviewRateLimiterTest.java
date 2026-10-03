package com.ahmed.alertsservice.services;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReviewRateLimiterTest {
    @Test void fifthPreviousAttemptBlocksAnotherSubmission() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any(TransactionDefinition.class))).thenReturn(mock(TransactionStatus.class));
        UUID user = UUID.randomUUID();
        when(jdbc.queryForObject(contains("count(*)"), eq(Integer.class), eq(user))).thenReturn(5);
        assertThatThrownBy(() -> new ReviewRateLimiter(jdbc, manager).record(user))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("429");
        verify(jdbc, never()).update(anyString(), (Object) any());
    }

    @Test void allowedAttemptIsPersistedIndependently() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any(TransactionDefinition.class))).thenReturn(mock(TransactionStatus.class));
        UUID user = UUID.randomUUID();
        when(jdbc.queryForObject(contains("count(*)"), eq(Integer.class), eq(user))).thenReturn(4);
        new ReviewRateLimiter(jdbc, manager).record(user);
        verify(jdbc).update(contains("insert into engagement.review_attempts"), (Object) eq(user));
        verify(manager).commit(any(TransactionStatus.class));
    }
}
