package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.model.SavedTraveler;
import com.ahmed.identityservice.model.User;
import com.ahmed.identityservice.notification.NotificationPort;
import com.ahmed.identityservice.repository.EmailVerificationTokenRepository;
import com.ahmed.identityservice.repository.SavedTravelerRepository;
import com.ahmed.identityservice.repository.UserRepository;
import com.ahmed.identityservice.security.TokenHashService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {
    @Mock UserRepository users;
    @Mock SavedTravelerRepository travelers;
    @Mock EmailVerificationTokenRepository verificationTokens;
    @Mock TokenHashService tokenHashService;
    @Mock NotificationPort notifications;
    @Mock ProfileImageStorage imageStorage;
    @InjectMocks ProfileService service;

    @Test
    void updatesOnlyExplicitProfileFieldsAndKeepsVerifiedState() {
        UUID id = UUID.randomUUID();
        User user = User.builder().id(id).email("a@example.com").firstName("Old").lastName("Name").isEmailVerified(true).build();
        when(users.findById(id)).thenReturn(Optional.of(user));
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileResponse result = service.update(id, new UpdateProfileRequest("Élodie", "O'Neil", "EUR", "en"));

        assertThat(result.firstName()).isEqualTo("Élodie");
        assertThat(result.preferredCurrency()).isEqualTo("EUR");
        assertThat(user.isEmailVerified()).isTrue();
        assertThat(user.getRoles()).isEmpty();
    }

    @Test
    void travelerCannotBeAccessedAcrossUsers() {
        UUID owner = UUID.randomUUID();
        when(travelers.findByPublicReferenceAndUserId("TRV-OTHER", owner)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.delete(owner, "TRV-OTHER"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Voyageur introuvable");
        verify(travelers, never()).delete(any(SavedTraveler.class));
    }

    @Test
    void rejectsUnsupportedCurrency() {
        UUID id = UUID.randomUUID();
        User user = User.builder().id(id).email("a@example.com").firstName("A").lastName("B").build();
        when(users.findById(id)).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> service.update(id, new UpdateProfileRequest("A", "B", "BTC", "fr")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Devise non prise en charge");
    }

    @Test
    void rejectsSvgEvenWhenClientClaimsAnImageMimeType() throws Exception {
        ProfileImageStorage storage = new ProfileImageStorage();
        MockMultipartFile svg = new MockMultipartFile("file", "avatar.svg", "image/png", "<svg><script>alert(1)</script></svg>".getBytes());

        assertThatThrownBy(() -> storage.store(svg))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Format de photo");
    }

    @Test
    void rejectsPhotosOverFiveMegabytes() throws Exception {
        ProfileImageStorage storage = new ProfileImageStorage();
        MockMultipartFile oversized = new MockMultipartFile("file", "avatar.png", "image/png", new byte[5 * 1024 * 1024 + 1]);

        assertThatThrownBy(() -> storage.store(oversized))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5 Mo");
    }
}
