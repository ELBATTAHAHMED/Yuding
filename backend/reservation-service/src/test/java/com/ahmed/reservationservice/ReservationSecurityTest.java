package com.ahmed.reservationservice;

import com.ahmed.reservationservice.DTO.ResponseDto;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.models.Hebergements;
import com.ahmed.reservationservice.models.Reservations;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class ReservationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    private Reservations sampleReservation(Long idr, Long idu) {
        Reservations res = new Reservations();
        res.setIdr(idr);
        res.setIdu(idu);
        res.setPrixtot(250.0);
        return res;
    }

    @Test
    @DisplayName("Anonymous access to /apir/reservations/me is rejected with 401 Unauthorized")
    void anonymousAccess_rejectedWith401() throws Exception {
        mockMvc.perform(get("/apir/reservations/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ROLE_USER cannot view all reservations on /apir/reservations/all (403 Forbidden)")
    void normalUser_cannotViewAllReservations() throws Exception {
        mockMvc.perform(get("/apir/reservations/all")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_ADMIN can view all reservations on /apir/reservations/all (200 OK)")
    void adminUser_canViewAllReservations() throws Exception {
        when(reservationServices.getAllReservations())
                .thenReturn(List.of(sampleReservation(1L, 10L), sampleReservation(2L, 20L)));

        mockMvc.perform(get("/apir/reservations/all")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))
                                .jwt(j -> j.subject("1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("ROLE_SUPPORT can view all reservations on /apir/reservations/all (200 OK)")
    void supportUser_canViewAllReservations() throws Exception {
        when(reservationServices.getAllReservations())
                .thenReturn(List.of(sampleReservation(1L, 10L)));

        mockMvc.perform(get("/apir/reservations/all")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_SUPPORT"))
                                .jwt(j -> j.subject("2"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("User can view their own reservation on /apir/reservations/id/{id} (200 OK)")
    void user_canViewOwnReservation() throws Exception {
        when(reservationServices.getReservationById(1L))
                .thenReturn(sampleReservation(1L, 10L));

        mockMvc.perform(get("/apir/reservations/id/1")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idr").value(1));
    }

    @Test
    @DisplayName("IDOR Prevention: User cannot view another user's reservation (403 Forbidden)")
    void idor_userCannotViewAnotherUsersReservation() throws Exception {
        // Reservation belongs to user 20L, but request is made by user 10L
        when(reservationServices.getReservationById(2L))
                .thenReturn(sampleReservation(2L, 20L));

        mockMvc.perform(get("/apir/reservations/id/2")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("IDOR Prevention: User cannot delete another user's reservation (403 Forbidden)")
    void idor_userCannotDeleteAnotherUsersReservation() throws Exception {
        // Reservation belongs to user 20L, but request is made by user 10L
        when(reservationServices.getReservationById(2L))
                .thenReturn(sampleReservation(2L, 20L));

        mockMvc.perform(delete("/apir/reservations/delete/2")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin can delete another user's reservation (204 No Content)")
    void admin_canDeleteAnotherUsersReservation() throws Exception {
        when(reservationServices.getReservationById(2L))
                .thenReturn(sampleReservation(2L, 20L));

        mockMvc.perform(delete("/apir/reservations/delete/2")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))
                                .jwt(j -> j.subject("1"))))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("ROLE_USER cannot create travel catalog accommodation (403 Forbidden)")
    void normalUser_cannotCreateAccommodation() throws Exception {
        Hebergements h = new Hebergements();
        h.setNom_hebergement("Grand Hotel");

        mockMvc.perform(post("/apir/hebergements/create")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(h)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE_CONTENT_MANAGER can create travel catalog accommodation (201 Created)")
    void contentManager_canCreateAccommodation() throws Exception {
        Hebergements h = new Hebergements();
        h.setId_hebergement(1L);
        h.setNom_hebergement("Grand Hotel");

        when(hebergementsServices.createHebergement(any())).thenReturn(h);

        mockMvc.perform(post("/apir/hebergements/create")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_CONTENT_MANAGER"))
                                .jwt(j -> j.subject("50")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(h)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nom_hebergement").value("Grand Hotel"));
    }
}
