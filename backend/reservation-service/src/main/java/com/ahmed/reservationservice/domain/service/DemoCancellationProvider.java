package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import java.util.UUID;

/** No supplier network call or claim of a real supplier cancellation. */
@Component
public class DemoCancellationProvider implements CancellationProvider {
    @Value("${yuding.cancellation.demo-failure:false}")
    private boolean simulatedFailure;

    @Override
    public Result cancel(Booking booking, OfferSnapshot snapshot, UUID requestId) {
        if (simulatedFailure) {
            return new Result(false, "YUDING_DEMO", null, "DEMO_FAILURE",
                    "La simulation d'annulation du fournisseur a échoué.");
        }
        return new Result(true, "YUDING_DEMO", "DEMO-CAN-" + requestId,
                "DEMO_ONLY", "Annulation simulée dans Yuding ; aucun fournisseur réel n'a été contacté.");
    }
}
