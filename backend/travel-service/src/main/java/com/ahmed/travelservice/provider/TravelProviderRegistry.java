package com.ahmed.travelservice.provider;

import com.ahmed.travelservice.config.TravelProviderProperties;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.NoConfiguredTravelProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TravelProviderRegistry {

    private static final Logger log = LoggerFactory.getLogger(TravelProviderRegistry.class);

    private final TravelProviderProperties properties;
    private final NoConfiguredTravelProvider noConfiguredProvider;
    private final Map<String, TravelProvider> providers = new ConcurrentHashMap<>();

    public TravelProviderRegistry(List<TravelProvider> discoveredProviders,
                                  TravelProviderProperties properties,
                                  NoConfiguredTravelProvider noConfiguredProvider) {
        this.properties = properties;
        this.noConfiguredProvider = noConfiguredProvider;

        // Register default provider-less implementation
        registerProvider(noConfiguredProvider);

        // Register all discovered Spring bean providers
        if (discoveredProviders != null) {
            for (TravelProvider provider : discoveredProviders) {
                registerProvider(provider);
            }
        }
    }

    /**
     * Registers or dynamically updates a provider implementation.
     */
    public void registerProvider(TravelProvider provider) {
        if (provider != null && provider.getMetadata() != null) {
            String code = provider.getMetadata().getProviderCode().toUpperCase(Locale.ROOT);
            providers.put(code, provider);
            log.info("TravelProviderRegistry: Registered provider '{}' ({}) with capabilities: {}",
                    code, provider.getMetadata().getDisplayName(), provider.getMetadata().getSupportedCapabilities());
        }
    }

    /**
     * Unregisters a provider implementation (primarily for test cleanup).
     */
    public void unregisterProvider(String providerCode) {
        if (providerCode != null) {
            providers.remove(providerCode.toUpperCase(Locale.ROOT));
        }
    }

    /**
     * Resolves the configured active provider for a given travel product domain.
     * Enforces capability validation.
     */
    public TravelProvider getProviderForProduct(TravelProduct product) {
        if (product == null) {
            return noConfiguredProvider;
        }

        String targetCode = getConfiguredProviderCode(product);
        if (targetCode == null || targetCode.isBlank() || "NONE".equalsIgnoreCase(targetCode)) {
            return noConfiguredProvider;
        }

        TravelProvider provider = getProvider(targetCode);
        if (provider == noConfiguredProvider) {
            log.warn("TravelProviderRegistry: Configured provider '{}' for product '{}' not found, falling back to NONE",
                    targetCode, product);
            return noConfiguredProvider;
        }

        // Validate capability
        if (!provider.supports(product.getRequiredCapability())) {
            throw TravelProviderException.capabilityNotSupported(
                    provider.getMetadata().getProviderCode(),
                    product.getRequiredCapability().name()
            );
        }

        return provider;
    }

    /**
     * Retrieves a provider by its unique uppercase code, falling back to NoConfiguredTravelProvider.
     */
    public TravelProvider getProvider(String providerCode) {
        if (providerCode == null || providerCode.isBlank() || "NONE".equalsIgnoreCase(providerCode.trim())) {
            return noConfiguredProvider;
        }
        String key = providerCode.trim().toUpperCase(Locale.ROOT).replace("-", "_");
        TravelProvider direct = providers.get(key);
        if (direct != null) {
            return direct;
        }
        return providers.getOrDefault(providerCode.trim().toUpperCase(Locale.ROOT), noConfiguredProvider);
    }

    /**
     * Returns all registered providers.
     */
    public Collection<TravelProvider> getAllProviders() {
        return Collections.unmodifiableCollection(providers.values());
    }

    private String getConfiguredProviderCode(TravelProduct product) {
        return switch (product) {
            case FLIGHTS -> properties.getFlights();
            case HOTELS -> properties.getHotels();
            case ACTIVITIES -> properties.getActivities();
            case TRANSFERS -> properties.getTransfers();
            case TRAINS -> properties.getTrains();
        };
    }
}
