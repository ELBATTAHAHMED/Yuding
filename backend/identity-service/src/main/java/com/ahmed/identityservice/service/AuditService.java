package com.ahmed.identityservice.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Service for recording security and administrative audit events into the audit schema.
 * Never logs raw passwords, tokens, PAN or CVV.
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private final JdbcTemplate jdbcTemplate;

    /**
     * Record an administrative action into audit.admin_actions
     */
    public void logAdminAction(UUID adminUserId, String actionType, String targetService,
                               String targetEntityType, String targetEntityId,
                               String reason, String metadataJson) {
        log.info("[AUDIT-ADMIN] adminUserId={}, actionType={}, targetService={}, entity={}:{}, reason={}",
                adminUserId, actionType, targetService, targetEntityType, targetEntityId, reason);

        try {
            String sql = """
                    INSERT INTO audit.admin_actions (admin_user_id, action_type, target_service, target_entity_type, target_entity_id, reason, metadata_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
                    """;
            jdbcTemplate.update(sql,
                    adminUserId,
                    actionType,
                    targetService,
                    targetEntityType,
                    targetEntityId,
                    reason,
                    metadataJson != null ? metadataJson : "{}",
                    Instant.now()
            );
        } catch (Exception e) {
            log.warn("Failed to persist admin action into audit.admin_actions: {}", e.getMessage());
        }
    }

    /**
     * Record a security event (e.g. lockout, unauthorized attempt, token revocation) into audit.security_events
     */
    public void logSecurityEvent(String eventType, UUID userId, String email, String ipAddress,
                                 String userAgent, String failureReason, int riskScore) {
        log.warn("[AUDIT-SECURITY] eventType={}, userId={}, email={}, ip={}, reason={}, riskScore={}",
                eventType, userId, email, ipAddress, failureReason, riskScore);

        try {
            String sql = """
                    INSERT INTO audit.security_events (event_type, user_id, email, ip_address, user_agent, failure_reason, risk_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """;
            jdbcTemplate.update(sql,
                    eventType,
                    userId,
                    email,
                    ipAddress != null ? ipAddress : "UNKNOWN",
                    userAgent != null ? userAgent : "UNKNOWN",
                    failureReason,
                    riskScore,
                    Instant.now()
            );
        } catch (Exception e) {
            log.warn("Failed to persist security event into audit.security_events: {}", e.getMessage());
        }
    }
}
