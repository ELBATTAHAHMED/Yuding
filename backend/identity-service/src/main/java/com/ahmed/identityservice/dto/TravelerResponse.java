package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.SavedTraveler;
import java.time.LocalDate;

public record TravelerResponse(String reference, String firstName, String lastName,
                               LocalDate dateOfBirth, String travelerType) {
    public static TravelerResponse from(SavedTraveler traveler) {
        return new TravelerResponse(traveler.getPublicReference(), traveler.getFirstName(),
                traveler.getLastName(), traveler.getDateOfBirth(), traveler.getTravelerType());
    }
}
