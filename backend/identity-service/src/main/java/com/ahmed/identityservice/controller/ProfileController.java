package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import java.util.*;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profileService;
    private UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }

    @PatchMapping("/me")
    public UserProfileResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) { return profileService.update(userId(jwt), request); }
    @PostMapping("/me/verification/resend")
    public ResponseEntity<MessageResponse> resend(@AuthenticationPrincipal Jwt jwt) { profileService.resendVerification(userId(jwt)); return ResponseEntity.ok(new MessageResponse("E-mail de vérification envoyé")); }
    @PostMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserProfileResponse uploadPhoto(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) { return profileService.uploadPhoto(userId(jwt), file); }
    @DeleteMapping("/me/photo")
    public UserProfileResponse removePhoto(@AuthenticationPrincipal Jwt jwt) { return profileService.removePhoto(userId(jwt)); }
    @GetMapping("/me/photo")
    public ResponseEntity<byte[]> photo(@AuthenticationPrincipal Jwt jwt) throws Exception {
        String key = profileService.photoKey(userId(jwt));
        String contentType = key != null && key.endsWith(".png") ? "image/png" : key != null && key.endsWith(".webp") ? "image/webp" : "image/jpeg";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).cacheControl(org.springframework.http.CacheControl.noCache()).body(profileService.photo(userId(jwt)));
    }
    @GetMapping("/travelers")
    public List<TravelerResponse> list(@AuthenticationPrincipal Jwt jwt) { return profileService.list(userId(jwt)); }
    @PostMapping("/travelers")
    public TravelerResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TravelerRequest request) { return profileService.create(userId(jwt), request); }
    @PutMapping("/travelers/{reference}")
    public TravelerResponse updateTraveler(@AuthenticationPrincipal Jwt jwt, @PathVariable String reference, @Valid @RequestBody TravelerRequest request) { return profileService.update(userId(jwt), reference, request); }
    @DeleteMapping("/travelers/{reference}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String reference) { profileService.delete(userId(jwt), reference); return ResponseEntity.noContent().build(); }
}
