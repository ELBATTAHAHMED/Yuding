package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.CreateDraftBookingRequest;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingReferenceException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingTransitionException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.TransportsServices;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class BookingControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BookingService bookingService;

    // Legacy mock beans to prevent application context startup failures
    @MockBean
    private ReservationServices reservationServices;

    @MockBean
    private ReservationRepository reservationRepository;

    @MockBean
    private HebergementsServices hebergementsServices;

    @MockBean
    private TransportsServices transportsServices;

    @MockBean
    private ActiviteesServices activiteesServices;

    @MockBean
    private UtilisateurFeign utilisateurFeign;

    private Booking createSampleBooking(UUID id, UUID userId, String reference, ProductType productType, BookingStatus status) {
        Instant now = Instant.now();
        return Booking.builder()
                .id(id)
                .userId(userId)
                .bookingReference(reference)
                .productType(productType)
                .status(status)
                .createdAt(now)
                .updatedAt(now)
                .statusChangedAt(now)
                .expiresAt(status.canExpire() ? now.plusSeconds(1800) : null)
                .version(0)
                .build();
    }

    @Test
    @DisplayName("Anonymous access to POST /bookings is rejected with 401 Unauthorized")
    void anonymous_createBooking_rejectedWith401() throws Exception {
        CreateDraftBookingRequest req = new CreateDraftBookingRequest(ProductType.FLIGHT);

        mockMvc.perform(post("/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated user can create a DRAFT booking (201 Created with Location header and bookingReference)")
    void authenticatedUser_createDraftBooking_returns201() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";
        CreateDraftBookingRequest req = new CreateDraftBookingRequest(ProductType.HOTEL);

        Booking booking = createSampleBooking(bookingId, userId, reference, ProductType.HOTEL, BookingStatus.DRAFT);
        when(bookingService.createDraft(eq(userId), eq(ProductType.HOTEL), eq(null))).thenReturn(booking);

        mockMvc.perform(post("/bookings")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/bookings/" + reference))
                .andExpect(jsonPath("$.bookingReference").value(reference))
                .andExpect(jsonPath("$.id").doesNotExist()) // Omit internal UUID
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.productType").value("HOTEL"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @DisplayName("User can retrieve their own booking on GET /bookings/{reference} (200 OK)")
    void user_canGetOwnBooking_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";
        Booking booking = createSampleBooking(bookingId, userId, reference, ProductType.TRAIN, BookingStatus.DRAFT);

        when(bookingService.getBookingByReference(eq(reference), eq(userId), eq(false))).thenReturn(booking);

        mockMvc.perform(get("/bookings/" + reference)
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value(reference))
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.productType").value("TRAIN"));
    }

    @Test
    @DisplayName("IDOR Defense: User cannot retrieve another user's booking reference (403 Forbidden)")
    void idor_userCannotGetAnotherUsersBooking_returns403() throws Exception {
        UUID userB = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";

        when(bookingService.getBookingByReference(eq(reference), eq(userB), eq(false)))
                .thenThrow(new BookingOwnershipException(UUID.randomUUID(), userB));

        mockMvc.perform(get("/bookings/" + reference)
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userB.toString()))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /bookings/{reference} returns 404 when reference is not found")
    void bookingNotFound_returns404() throws Exception {
        UUID userId = UUID.randomUUID();
        String reference = "YUD-NTFND222";

        when(bookingService.getBookingByReference(eq(reference), eq(userId), eq(false)))
                .thenThrow(new BookingNotFoundException(reference));

        mockMvc.perform(get("/bookings/" + reference)
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /bookings/{reference} returns 400 Bad Request for malformed reference syntax")
    void malformedReference_returns400() throws Exception {
        UUID userId = UUID.randomUUID();
        String invalidReference = "invalid-ref-123";

        when(bookingService.getBookingByReference(eq(invalidReference), eq(userId), eq(false)))
                .thenThrow(new InvalidBookingReferenceException(invalidReference));

        mockMvc.perform(get("/bookings/" + invalidReference)
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    @DisplayName("GET /bookings/me lists all bookings belonging to the caller with bookingReference (200 OK)")
    void getMyBookings_returnsUserBookings() throws Exception {
        UUID userId = UUID.randomUUID();
        List<Booking> bookings = List.of(
                createSampleBooking(UUID.randomUUID(), userId, "YUD-AAAA2222", ProductType.FLIGHT, BookingStatus.DRAFT),
                createSampleBooking(UUID.randomUUID(), userId, "YUD-BBBB3333", ProductType.HOTEL, BookingStatus.CONFIRMED)
        );

        when(bookingService.getUserBookings(userId)).thenReturn(bookings);

        mockMvc.perform(get("/bookings/me")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].bookingReference").value("YUD-AAAA2222"))
                .andExpect(jsonPath("$[1].bookingReference").value("YUD-BBBB3333"));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/cancel cancels booking when allowed (200 OK)")
    void cancelBooking_success_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";
        Booking cancelled = createSampleBooking(bookingId, userId, reference, ProductType.ACTIVITY, BookingStatus.CANCELLED);

        when(bookingService.cancelByReference(eq(reference), eq(userId), eq(false))).thenReturn(cancelled);

        mockMvc.perform(post("/bookings/" + reference + "/cancel")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value(reference))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/cancel returns 409 Conflict when transition is forbidden")
    void cancelBooking_forbiddenTransition_returns409() throws Exception {
        UUID userId = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";

        when(bookingService.cancelByReference(eq(reference), eq(userId), eq(false)))
                .thenThrow(new InvalidBookingTransitionException(BookingStatus.REFUNDED, BookingStatus.CANCELLED));

        mockMvc.perform(post("/bookings/" + reference + "/cancel")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/offer-snapshot attaches offer snapshot (200 OK)")
    void attachOfferSnapshot_success_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";
        String selectionRef = "sel-flight-123";

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("fl-123")
                .providerAmount(new BigDecimal("300.00"))
                .providerCurrency("EUR")
                .snapshotHash("1234567890123456789012345678901234567890123456789012345678901234")
                .capturedAt(Instant.now())
                .snapshotExpiresAt(Instant.now().plusSeconds(900))
                .build();

        when(bookingService.attachOfferSnapshot(eq(reference), eq(selectionRef), eq(userId), eq(false)))
                .thenReturn(snapshot);

        mockMvc.perform(post("/bookings/" + reference + "/offer-snapshot")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"selectionRef\": \"" + selectionRef + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("SCRAPPA"))
                .andExpect(jsonPath("$.providerOfferId").value("fl-123"))
                .andExpect(jsonPath("$.providerAmount").value(300.00))
                .andExpect(jsonPath("$.providerCurrency").value("EUR"))
                .andExpect(jsonPath("$.snapshotHash").value("1234567890123456789012345678901234567890123456789012345678901234"));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/offer-snapshot rejects unauthorized user with 403 Forbidden")
    void attachOfferSnapshot_unauthorizedUser_returns403() throws Exception {
        UUID attackerId = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";
        String selectionRef = "sel-flight-123";

        when(bookingService.attachOfferSnapshot(eq(reference), eq(selectionRef), eq(attackerId), eq(false)))
                .thenThrow(new BookingOwnershipException(UUID.randomUUID(), attackerId));

        mockMvc.perform(post("/bookings/" + reference + "/offer-snapshot")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(attackerId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"selectionRef\": \"" + selectionRef + "\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /bookings/{reference}/offer-snapshot returns snapshot for owner (200 OK)")
    void getOfferSnapshot_success_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        String reference = "YUD-K7M4P2Q8";

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .productType(ProductType.HOTEL)
                .provider("NUITEE")
                .providerOfferId("lp1897")
                .providerAmount(new BigDecimal("120.00"))
                .providerCurrency("EUR")
                .snapshotHash("1234567890123456789012345678901234567890123456789012345678901234")
                .capturedAt(Instant.now())
                .snapshotExpiresAt(Instant.now().plusSeconds(900))
                .build();

        when(bookingService.getSnapshotByBookingReference(eq(reference), eq(userId), eq(false)))
                .thenReturn(Optional.of(snapshot));

        mockMvc.perform(get("/bookings/" + reference + "/offer-snapshot")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("NUITEE"))
                .andExpect(jsonPath("$.providerOfferId").value("lp1897"));
    }
}
