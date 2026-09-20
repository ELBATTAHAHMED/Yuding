package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.SecurityEventResponse;
import com.ahmed.identityservice.security.DeviceUtils;
import com.ahmed.identityservice.security.PrivacyUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
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
     * Record a security event into audit.security_events
     */
    public void logSecurityEvent(String eventType, UUID userId, String email, String ipAddress,
                                 String userAgent, String failureReason, int riskScore, UUID sessionId) {
        log.warn("[AUDIT-SECURITY] eventType={}, userId={}, email={}, ip={}, reason={}, riskScore={}, sessionId={}",
                eventType, userId, email, ipAddress, failureReason, riskScore, sessionId);

        try {
            String sql = """
                    INSERT INTO audit.security_events (event_type, user_id, email, ip_address, user_agent, failure_reason, risk_score, session_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """;
            jdbcTemplate.update(sql,
                    eventType,
                    userId,
                    email,
                    ipAddress != null ? ipAddress : "UNKNOWN",
                    userAgent != null ? userAgent : "UNKNOWN",
                    failureReason,
                    riskScore,
                    sessionId,
                    Instant.now()
            );
        } catch (Exception e) {
            log.warn("Failed to persist security event into audit.security_events: {}", e.getMessage());
        }
    }

    public void logSecurityEvent(String eventType, UUID userId, String email, String ipAddress,
                                 String userAgent, String failureReason, int riskScore) {
        logSecurityEvent(eventType, userId, email, ipAddress, userAgent, failureReason, riskScore, null);
    }

    /**
     * Retrieve security history for the authenticated user with masked privacy-conscious fields.
     */
    public List<SecurityEventResponse> getUserSecurityEvents(UUID userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        String sql = """
                SELECT id, event_type, ip_address, user_agent, failure_reason, risk_score, created_at
                FROM audit.security_events
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Long id = rs.getLong("id");
            String eventType = rs.getString("event_type");
            String ip = rs.getString("ip_address");
            String ua = rs.getString("user_agent");
            String reason = rs.getString("failure_reason");
            int risk = rs.getInt("risk_score");
            Timestamp ts = rs.getTimestamp("created_at");
            Instant createdAt = ts != null ? ts.toInstant() : Instant.now();

            String maskedIp = PrivacyUtils.maskIpAddress(ip);
            String deviceLabel = DeviceUtils.parseDeviceLabel(ua, null);

            return new SecurityEventResponse(id, eventType, maskedIp, deviceLabel, reason, risk, createdAt);
        }, userId, safeLimit);
    }
}
