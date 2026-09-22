package com.ahmed.travelservice.dto.image;

/**
 * Functional role of an image asset within the Yuding platform.
 */
public enum ImageRole {
    /** Primary hero landscape photo for a destination context guide. */
    DESTINATION_HERO,

    /** Secondary gallery photo for a destination context guide. */
    DESTINATION_GALLERY,

    /** Primary hotel property photograph. */
    HOTEL,

    /** Specific hotel room photograph. */
    ROOM,

    /** Specific activity/tour photograph. */
    ACTIVITY,

    /** Other auxiliary imagery (e.g. transfers, maps, UI decorative). */
    OTHER
}
