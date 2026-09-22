package com.ahmed.reservationservice.domain.payment.provider;

import com.ahmed.reservationservice.domain.config.PaymentProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Registry resolving available and active PaymentProvider implementations.
 */
@Component
@Slf4j
public class PaymentProviderRegistry {

    private final Map<String, PaymentProvider> providers = new HashMap<>();
    private final PaymentProperties paymentProperties;

    @Autowired
    public PaymentProviderRegistry(List<PaymentProvider> providerList, PaymentProperties paymentProperties) {
        this.paymentProperties = paymentProperties;
        if (providerList != null) {
            for (PaymentProvider p : providerList) {
                providers.put(p.getProviderName().toLowerCase(), p);
            }
        }
        log.info("PaymentProviderRegistry initialized with providers: {}", providers.keySet());
    }

    /**
     * Resolves the configured active PaymentProvider.
     * Gracefully falls back to MockPaymentProvider if PayPal Sandbox credentials are not configured.
     */
    public PaymentProvider getActiveProvider() {
        String configuredName = paymentProperties.getProvider() != null
                ? paymentProperties.getProvider().toLowerCase()
                : "paypal-sandbox";

        if ("paypal-sandbox".equals(configuredName)) {
            if (!paymentProperties.getPaypal().isConfigured()) {
                log.warn("PAYPAL SANDBOX NOT CONFIGURED: Falling back to MockPaymentProvider. Add credentials to .env.local to enable real PayPal Sandbox.");
                PaymentProvider mock = providers.get(MockPaymentProvider.PROVIDER_NAME);
                if (mock != null) {
                    return mock;
                }
            }
        }

        PaymentProvider provider = providers.get(configuredName);
        if (provider != null) {
            return provider;
        }

        log.warn("Requested provider [{}] not found. Falling back to MockPaymentProvider.", configuredName);
        return providers.getOrDefault(MockPaymentProvider.PROVIDER_NAME, providers.values().stream().findFirst().orElseThrow());
    }

    /**
     * Resolves a specific provider by name.
     */
    public PaymentProvider getProvider(String name) {
        if (name == null) return getActiveProvider();
        return providers.getOrDefault(name.toLowerCase(), getActiveProvider());
    }
}
