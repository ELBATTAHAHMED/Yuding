package com.ahmed.aiservice.domain.tool;

import java.util.Map;
import java.util.Objects;

/**
 * Definition of an AI tool including its name, description, and parameter schema.
 * The parameter schema follows standard JSON Schema format compatible with both
 * Gemini function declarations and OpenAI/Groq function calling tools.
 */
public class AiToolDefinition {

    private final String name;
    private final String description;
    private final Map<String, Object> parameterSchema;

    public AiToolDefinition(String name, String description, Map<String, Object> parameterSchema) {
        this.name = Objects.requireNonNull(name, "name must not be null");
        this.description = Objects.requireNonNull(description, "description must not be null");
        this.parameterSchema = Objects.requireNonNull(parameterSchema, "parameterSchema must not be null");
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Map<String, Object> getParameterSchema() {
        return parameterSchema;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AiToolDefinition that)) return false;
        return Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    @Override
    public String toString() {
        return "AiToolDefinition{name='" + name + "'}";
    }
}
