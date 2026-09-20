package com.ahmed.travelservice.provider;

import lombok.Builder;
import lombok.Value;

import java.util.Collections;
import java.util.Set;

@Value
@Builder
public class ProviderMetadata {
    String providerCode;
    String displayName;
    Set<ProviderCapability> supportedCapabilities;

    public boolean supports(ProviderCapability capability) {
        return supportedCapabilities != null && supportedCapabilities.contains(capability);
    }

    public static ProviderMetadata none() {
        return ProviderMetadata.builder()
                .providerCode("NONE")
                .displayName("No Configured Provider")
                .supportedCapabilities(Collections.emptySet())
                .build();
    }
}
