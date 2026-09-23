package com.ahmed.aiservice.domain.tool;

import java.util.Collections;
import java.util.Set;

/**
 * Context passed to tool execution containing caller security credentials
 * for defense-in-depth downstream service calls and authorization checks.
 */
public class AiToolExecutionContext {

    private final String jwtToken;
    private final String userId;
    private final Set<String> roles;

    public AiToolExecutionContext(String jwtToken, String userId, Set<String> roles) {
        this.jwtToken = jwtToken;
        this.userId = userId;
        this.roles = roles != null ? Collections.unmodifiableSet(roles) : Collections.emptySet();
    }

    public static AiToolExecutionContext anonymous() {
        return new AiToolExecutionContext(null, null, Collections.emptySet());
    }

    public String getJwtToken() {
        return jwtToken;
    }

    public String getUserId() {
        return userId;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public boolean isAuthenticated() {
        return jwtToken != null && !jwtToken.isBlank();
    }

    @Override
    public String toString() {
        return "AiToolExecutionContext{userId='" + userId + "', roles=" + roles + ", hasToken=" + isAuthenticated() + "}";
    }
}
