package com.ahmed.aiservice.domain.tool;

import java.util.Collections;
import java.util.Map;
import java.util.Objects;

/**
 * Representation of a tool invocation requested by an AI model.
 */
public class AiToolCall {

    private final String id;
    private final String name;
    private final Map<String, Object> arguments;

    public AiToolCall(String id, String name, Map<String, Object> arguments) {
        this.id = id != null ? id : name;
        this.name = Objects.requireNonNull(name, "name must not be null");
        this.arguments = arguments != null ? Collections.unmodifiableMap(arguments) : Collections.emptyMap();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Map<String, Object> getArguments() {
        return arguments;
    }

    @Override
    public String toString() {
        return "AiToolCall{id='" + id + "', name='" + name + "'}";
    }
}
