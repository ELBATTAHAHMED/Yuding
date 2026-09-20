package com.ahmed.travelservice.provider.error;

import lombok.Getter;

@Getter
public class TravelProviderException extends RuntimeException {

    private final String providerCode;
    private final ProviderErrorCode errorCode;

    public TravelProviderException(String providerCode, ProviderErrorCode errorCode, String message) {
        super(message);
        this.providerCode = providerCode != null ? providerCode : "UNKNOWN";
        this.errorCode = errorCode != null ? errorCode : ProviderErrorCode.PROVIDER_UNAVAILABLE;
    }

    public TravelProviderException(String providerCode, ProviderErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.providerCode = providerCode != null ? providerCode : "UNKNOWN";
        this.errorCode = errorCode != null ? errorCode : ProviderErrorCode.PROVIDER_UNAVAILABLE;
    }

    public static TravelProviderException notConfigured(String providerCode, String message) {
        return new TravelProviderException(providerCode, ProviderErrorCode.PROVIDER_NOT_CONFIGURED, message);
    }

    public static TravelProviderException unavailable(String providerCode, String message) {
        return new TravelProviderException(providerCode, ProviderErrorCode.PROVIDER_UNAVAILABLE, message);
    }

    public static TravelProviderException capabilityNotSupported(String providerCode, String capability) {
        return new TravelProviderException(
                providerCode,
                ProviderErrorCode.CAPABILITY_NOT_SUPPORTED,
                "Travel provider '" + providerCode + "' does not support capability: " + capability
        );
    }

    public static TravelProviderException offerNotFound(String providerCode, String offerId) {
        return new TravelProviderException(
                providerCode,
                ProviderErrorCode.OFFER_NOT_FOUND,
                "Offer '" + offerId + "' was not found by provider '" + providerCode + "'"
        );
    }

    public static TravelProviderException offerExpired(String providerCode, String offerId) {
        return new TravelProviderException(
                providerCode,
                ProviderErrorCode.OFFER_EXPIRED,
                "Offer '" + offerId + "' has expired on provider '" + providerCode + "'"
        );
    }
}
