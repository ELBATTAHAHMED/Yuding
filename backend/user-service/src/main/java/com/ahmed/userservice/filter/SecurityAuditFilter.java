package com.ahmed.userservice.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * Security audit and request-tracing filter.
 * Assigns or propagates X-Request-Id across MDC and HTTP headers,
 * records request/response audit metrics, and guarantees sensitive credentials
 * (passwords, tokens, PAN, CVV) are never logged.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityAuditFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditFilter.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String MDC_REQUEST_ID_KEY = "requestId";

    private static final Set<String> SENSITIVE_QUERY_PARAMS = Set.of(
            "password", "pass", "pwd", "token", "secret", "cvv", "card", "pan", "authorization"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        MDC.put(MDC_REQUEST_ID_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        long startTime = System.currentTimeMillis();
        String method = request.getMethod();
        String uri = request.getRequestURI();
        String clientIp = getClientIp(request);
        String safeQuery = sanitizeQueryString(request.getQueryString());

        log.info("[AUDIT-IN] [{}] {} {}{} from IP: {}",
                requestId, method, uri, (safeQuery != null ? "?" + safeQuery : ""), clientIp);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            log.info("[AUDIT-OUT] [{}] {} {} completed with status: {} in {}ms",
                    requestId, method, uri, status, duration);
            MDC.remove(MDC_REQUEST_ID_KEY);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String sanitizeQueryString(String queryString) {
        if (queryString == null || queryString.isBlank()) {
            return null;
        }
        StringBuilder safe = new StringBuilder();
        for (String param : queryString.split("&")) {
            String[] kv = param.split("=", 2);
            if (safe.length() > 0) safe.append("&");
            if (kv.length > 0) {
                String key = kv[0].toLowerCase();
                if (SENSITIVE_QUERY_PARAMS.stream().anyMatch(key::contains)) {
                    safe.append(kv[0]).append("=[REDACTED]");
                } else {
                    safe.append(param);
                }
            }
        }
        return safe.toString();
    }
}
