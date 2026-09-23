package com.ahmed.aiservice.domain.tool;

import java.util.Collections;
import java.util.Map;
import java.util.Objects;

/**
 * Encapsulates the output of executing an AI tool.
 */
public class AiToolResult {

    public enum Status {
        SUCCESS,
        ERROR
    }

    private final String callId;
    private final String toolName;
    private final Status status;
    private final Map<String, Object> data;
    private final String errorMessage;

    private AiToolResult(String callId, String toolName, Status status, Map<String, Object> data, String errorMessage) {
        this.callId = Objects.requireNonNull(callId, "callId must not be null");
        this.toolName = Objects.requireNonNull(toolName, "toolName must not be null");
        this.status = Objects.requireNonNull(status, "status must not be null");
        this.data = data != null ? Collections.unmodifiableMap(data) : Collections.emptyMap();
        this.errorMessage = errorMessage;
    }

    public static AiToolResult success(String callId, String toolName, Map<String, Object> data) {
        return new AiToolResult(callId, toolName, Status.SUCCESS, data, null);
    }

    public static AiToolResult error(String callId, String toolName, String errorMessage) {
        return new AiToolResult(callId, toolName, Status.ERROR, Collections.emptyMap(), errorMessage);
    }

    public String getCallId() {
        return callId;
    }

    public String getToolName() {
        return toolName;
    }

    public Status getStatus() {
        return status;
    }

    public boolean isSuccess() {
        return status == Status.SUCCESS;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    @Override
    public String toString() {
        return "AiToolResult{callId='" + callId + "', toolName='" + toolName + "', status=" + status + "}";
    }
}
