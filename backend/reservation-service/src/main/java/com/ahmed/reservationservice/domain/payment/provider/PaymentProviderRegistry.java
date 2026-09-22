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
                throw new IllegalStateException("PayPal Sandbox is configured as active provider, but PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not set. Explicitly set PAYMENT_PROVIDER=mock if mock mode is desired.");
            }
            PaymentProvider paypal = providers.get(PayPalSandboxPaymentProvider.PROVIDER_NAME);
            if (paypal != null) {
                return paypal;
            }
            throw new IllegalStateException("PayPal Sandbox provider bean not found in application context.");
        }

        PaymentProvider provider = providers.get(configuredName);
        if (provider != null) {
            return provider;
        }

        throw new IllegalArgumentException("Unknown payment provider configured: " + configuredName);
    }

    /**
     * Resolves a specific provider by name.
     */
    public PaymentProvider getProvider(String name) {
        if (name == null) return getActiveProvider();
        return providers.getOrDefault(name.toLowerCase(), getActiveProvider());
    }
}
