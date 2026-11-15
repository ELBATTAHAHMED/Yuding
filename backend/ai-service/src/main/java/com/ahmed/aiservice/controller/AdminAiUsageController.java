package com.ahmed.aiservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping({"/api/ai/admin", "/ai/admin"})
@PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
@RequiredArgsConstructor
public class AdminAiUsageController {

    private final JdbcTemplate jdbc;

    @GetMapping("/usage")
    public Map<String, Object> getAiUsage() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("timestamp", Instant.now());

        // 1. Conversation & Message Volume
        Long totalConversations = jdbc.queryForObject("SELECT count(*) FROM ai.conversations", Long.class);
        Long activeConversations = jdbc.queryForObject("SELECT count(*) FROM ai.conversations WHERE status = 'ACTIVE'", Long.class);
        Long totalMessages = jdbc.queryForObject("SELECT count(*) FROM ai.messages", Long.class);

        List<Map<String, Object>> roleBreakdown = jdbc.queryForList("""
            SELECT role, count(*) as count
            FROM ai.messages
            GROUP BY role
            ORDER BY count DESC
        """);

        Map<String, Object> volume = new LinkedHashMap<>();
        volume.put("totalConversations", totalConversations != null ? totalConversations : 0);
        volume.put("activeConversations", activeConversations != null ? activeConversations : 0);
        volume.put("totalMessages", totalMessages != null ? totalMessages : 0);
        volume.put("roleBreakdown", roleBreakdown);
        response.put("volume", volume);

        // 2. Token Consumption
        Long totalTokens = jdbc.queryForObject("SELECT coalesce(sum(tokens_used), 0) FROM ai.messages", Long.class);
        Long tokensToday = jdbc.queryForObject("SELECT coalesce(sum(tokens_used), 0) FROM ai.messages WHERE created_at >= date_trunc('day', now())", Long.class);
        Long tokensLast7Days = jdbc.queryForObject("SELECT coalesce(sum(tokens_used), 0) FROM ai.messages WHERE created_at >= now() - interval '7 days'", Long.class);
        Long tokensLast30Days = jdbc.queryForObject("SELECT coalesce(sum(tokens_used), 0) FROM ai.messages WHERE created_at >= now() - interval '30 days'", Long.class);

        List<Map<String, Object>> modelTokens = jdbc.queryForList("""
            SELECT coalesce(nullif(model, ''), 'gemini-1.5-flash') as model,
                   coalesce(nullif(provider, ''), 'GOOGLE_GEMINI') as provider,
                   count(*) as message_count,
                   coalesce(sum(tokens_used), 0) as total_tokens
            FROM ai.messages
            WHERE role = 'ASSISTANT'
            GROUP BY coalesce(nullif(model, ''), 'gemini-1.5-flash'), coalesce(nullif(provider, ''), 'GOOGLE_GEMINI')
        """);

        Map<String, Object> tokens = new LinkedHashMap<>();
        tokens.put("totalTokens", totalTokens != null ? totalTokens : 0);
        tokens.put("tokensToday", tokensToday != null ? tokensToday : 0);
        tokens.put("tokensLast7Days", tokensLast7Days != null ? tokensLast7Days : 0);
        tokens.put("tokensLast30Days", tokensLast30Days != null ? tokensLast30Days : 0);
        tokens.put("byModel", modelTokens);
        // Cost estimation is explicitly unbilled/unavailable per project rules
        tokens.put("estimatedCostUsd", null);
        tokens.put("costNotice", "Tarification réelle indisponible (clé API gratuite ou non facturée à l'usage). Aucune estimation arbitraire inventée.");
        response.put("tokens", tokens);

        // 3. Tool Execution Metrics & Latency
        List<Map<String, Object>> toolMetrics = jdbc.queryForList("""
            SELECT tool_name,
                   count(*) as total_calls,
                   count(*) FILTER (WHERE status = 'SUCCESS') as successful_calls,
                   count(*) FILTER (WHERE status = 'ERROR' OR status = 'TIMEOUT') as failed_calls,
                   round(avg(duration_ms)) as avg_duration_ms,
                   min(duration_ms) as min_duration_ms,
                   max(duration_ms) as max_duration_ms
            FROM ai.tool_calls
            GROUP BY tool_name
            ORDER BY total_calls DESC
        """);
        response.put("toolCalls", toolMetrics);

        return response;
    }
}
