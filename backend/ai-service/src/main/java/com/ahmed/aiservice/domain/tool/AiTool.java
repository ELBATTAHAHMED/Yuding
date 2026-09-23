package com.ahmed.aiservice.domain.tool;

/**
 * Provider-neutral interface for AI callable tools.
 * All implementations MUST be strictly read-only in Phase 45.
 */
public interface AiTool {

    /**
     * Returns the formal definition and parameter schema of this tool.
     */
    AiToolDefinition getDefinition();

    /**
     * Executes the tool with the provided arguments and caller security context.
     * Must not throw uncaught exceptions; any execution failure should be captured
     * in an {@link AiToolResult#error(String, String, String)}.
     */
    AiToolResult execute(AiToolCall call, AiToolExecutionContext context);
}
