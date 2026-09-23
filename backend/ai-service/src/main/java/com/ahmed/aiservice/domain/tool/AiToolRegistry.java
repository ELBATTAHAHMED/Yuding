package com.ahmed.aiservice.domain.tool;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry holding all available {@link AiTool} instances.
 */
@Component
public class AiToolRegistry {

    private static final Logger log = LoggerFactory.getLogger(AiToolRegistry.class);

    private final Map<String, AiTool> tools = new ConcurrentHashMap<>();

    public AiToolRegistry(List<AiTool> registeredTools) {
        if (registeredTools != null) {
            for (AiTool tool : registeredTools) {
                AiToolDefinition def = tool.getDefinition();
                tools.put(def.getName(), tool);
                log.info("Registered AI tool: name='{}', desc='{}'", def.getName(), def.getDescription());
            }
        }
    }

    public Optional<AiTool> getTool(String name) {
        if (name == null) return Optional.empty();
        return Optional.ofNullable(tools.get(name));
    }

    public boolean hasTool(String name) {
        return name != null && tools.containsKey(name);
    }

    public List<AiTool> getAllTools() {
        return new ArrayList<>(tools.values());
    }

    public List<AiToolDefinition> getDefinitions() {
        return tools.values().stream()
                .map(AiTool::getDefinition)
                .toList();
    }
}
