package com.ahmed.travelservice.service;

import com.ahmed.travelservice.cache.OfferSelectionCache;
import com.ahmed.travelservice.dto.response.ActivityOfferDto;
import com.ahmed.travelservice.dto.response.ResolvedOfferDto;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ActivitySelectionSnapshotTest {
    @Test
    void preservesProviderImageInTrustedActivitySelection() {
        var cache = mock(OfferSelectionCache.class);
        var service = new TravelSearchService(mock(TravelProviderRegistry.class), null, null, null, null, cache);
        var offer = ActivityOfferDto.builder().offerId("activity-1").title("Visite")
                .imageUrl("https://example.com/activity.jpg").build();
        service.registerActivityOffers(List.of(offer), 2);
        var selection = ArgumentCaptor.forClass(ResolvedOfferDto.class);
        verify(cache).put(anyString(), selection.capture());
        assertThat(selection.getValue().getSelectedDetails()).containsEntry("imageUrl", "https://example.com/activity.jpg");
    }
}
