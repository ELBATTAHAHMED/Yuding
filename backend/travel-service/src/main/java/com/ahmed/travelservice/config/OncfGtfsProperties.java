package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "travel.oncf-gtfs")
public class OncfGtfsProperties {

    /**
     * Path to local directory containing extracted GTFS text files
     * (calendar.txt, stops.txt, routes.txt, trips.txt, stop_times.txt, agency.txt, feed_info.txt).
     */
    private String dataPath = "data/oncf-gtfs";

    /**
     * Whether the local ONCF GTFS provider is enabled.
     */
    private boolean enabled = true;

    /**
     * Source repository or URL for dataset provenance.
     */
    private String source = "https://github.com/orhazal/oncf-gtfs-unofficial";

    /**
     * Dataset license identifier.
     */
    private String license = "ODbL-1.0";

    /**
     * Official ONCF portal URL for user schedule verification and ticket purchasing.
     */
    private String officialPortalUrl = "https://www.oncf-voyages.ma";
}
