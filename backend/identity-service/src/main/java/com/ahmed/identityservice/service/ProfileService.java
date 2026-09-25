package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.model.SavedTraveler;
import com.ahmed.identityservice.model.User;
import com.ahmed.identityservice.repository.SavedTravelerRepository;
import com.ahmed.identityservice.repository.UserRepository;
import com.ahmed.identityservice.repository.EmailVerificationTokenRepository;
import com.ahmed.identityservice.notification.NotificationPort;
import com.ahmed.identityservice.security.TokenHashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private static final Set<String> CURRENCIES = Set.of("MAD", "EUR", "USD", "GBP");
    private static final Set<String> LANGUAGES = Set.of("fr", "en");
    private static final Set<String> TRAVELER_TYPES = Set.of("ADULT", "CHILD", "INFANT");
    private final UserRepository userRepository;
    private final SavedTravelerRepository travelerRepository;
    private final EmailVerificationTokenRepository verificationRepository;
    private final TokenHashService tokenHashService;
    private final NotificationPort notificationPort;
    private final ProfileImageStorage imageStorage;

    @Transactional
    public UserProfileResponse update(UUID userId, UpdateProfileRequest request) {
        User user = user(userId);
        String currency = normalize(request.preferredCurrency(), user.getPreferredCurrency());
        String language = normalize(request.preferredLanguage(), user.getPreferredLanguage());
        if (!CURRENCIES.contains(currency)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Devise non prise en charge");
        if (!LANGUAGES.contains(language)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Langue non prise en charge");
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setPreferredCurrency(currency);
        user.setPreferredLanguage(language);
        return UserProfileResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<TravelerResponse> list(UUID userId) { return travelerRepository.findByUserIdOrderByCreatedAtAsc(userId).stream().map(TravelerResponse::from).toList(); }

    @Transactional
    public TravelerResponse create(UUID userId, TravelerRequest request) {
        String type = request.travelerType().toUpperCase(Locale.ROOT);
        validateType(type);
        SavedTraveler traveler = SavedTraveler.builder().publicReference(reference()).userId(userId)
                .firstName(request.firstName().trim()).lastName(request.lastName().trim())
                .dateOfBirth(request.dateOfBirth()).travelerType(type).build();
        return TravelerResponse.from(travelerRepository.save(traveler));
    }

    @Transactional
    public TravelerResponse update(UUID userId, String reference, TravelerRequest request) {
        SavedTraveler traveler = owned(userId, reference);
        String type = request.travelerType().toUpperCase(Locale.ROOT); validateType(type);
        traveler.setFirstName(request.firstName().trim()); traveler.setLastName(request.lastName().trim());
        traveler.setDateOfBirth(request.dateOfBirth()); traveler.setTravelerType(type);
        return TravelerResponse.from(travelerRepository.save(traveler));
    }

    @Transactional
    public void delete(UUID userId, String reference) { travelerRepository.delete(owned(userId, reference)); }

    @Transactional
    public void resendVerification(UUID userId) {
        User user = user(userId);
        if (user.isEmailVerified()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Votre e-mail est déjà vérifié");
        verificationRepository.findTopByUserIdOrderByCreatedAtDesc(userId).ifPresent(last -> {
            if (last.getCreatedAt().isAfter(Instant.now().minus(2, ChronoUnit.MINUTES)))
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Patientez avant de renvoyer l’e-mail");
        });
        verificationRepository.findByUserIdAndVerifiedAtIsNull(userId).forEach(token -> token.setVerifiedAt(Instant.now()));
        String raw = tokenHashService.generateSecureToken();
        verificationRepository.save(com.ahmed.identityservice.model.EmailVerificationToken.builder().userId(userId)
                .tokenHash(tokenHashService.hashToken(raw)).expiresAt(Instant.now().plus(24, ChronoUnit.HOURS)).build());
        notificationPort.sendEmailVerification(user.getEmail(), raw);
    }

    @Transactional
    public UserProfileResponse uploadPhoto(UUID userId, MultipartFile file) {
        User user = user(userId);
        try {
            String old = user.getProfileImageKey();
            user.setProfileImageKey(imageStorage.store(file));
            UserProfileResponse response = UserProfileResponse.from(userRepository.save(user));
            imageStorage.delete(old);
            return response;
        } catch (IOException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impossible d’enregistrer la photo"); }
        catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage()); }
    }

    @Transactional
    public UserProfileResponse removePhoto(UUID userId) {
        User user = user(userId); String old = user.getProfileImageKey(); user.setProfileImageKey(null);
        UserProfileResponse response = UserProfileResponse.from(userRepository.save(user)); imageStorage.delete(old); return response;
    }

    @Transactional(readOnly = true)
    public byte[] photo(UUID userId) throws IOException { String key = user(userId).getProfileImageKey(); if (key == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo introuvable"); return imageStorage.load(key); }
    @Transactional(readOnly = true)
    public String photoKey(UUID userId) { return user(userId).getProfileImageKey(); }

    private User user(UUID id) { return userRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte introuvable")); }
    private SavedTraveler owned(UUID userId, String reference) { return travelerRepository.findByPublicReferenceAndUserId(reference, userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voyageur introuvable")); }
    private void validateType(String type) { if (!TRAVELER_TYPES.contains(type)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de voyageur invalide"); }
    private String normalize(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.trim(); }
    private String reference() { return "TRV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT); }
}
