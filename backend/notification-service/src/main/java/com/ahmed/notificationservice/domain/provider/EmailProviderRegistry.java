package com.ahmed.notificationservice.domain.provider;

import com.ahmed.notificationservice.config.NotificationProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class EmailProviderRegistry {

    private final List<EmailProvider> providers;
    private final NotificationProperties properties;

    public EmailProvider getActiveProvider() {
        String activeName = properties.getActiveProvider();
        Map<String, EmailProvider> map = providers.stream()
                .collect(Collectors.toMap(p -> p.getProviderName().toLowerCase(), Function.identity()));

        EmailProvider provider = map.get(activeName.toLowerCase());
        if (provider != null) {
            return provider;
        }
        return map.getOrDefault("smtp", providers.get(0));
    }

    public EmailProvider getProvider(String name) {
        if (name == null) return getActiveProvider();
        for (EmailProvider p : providers) {
            if (p.getProviderName().equalsIgnoreCase(name)) {
                return p;
            }
        }
        return getActiveProvider();
    }
}
