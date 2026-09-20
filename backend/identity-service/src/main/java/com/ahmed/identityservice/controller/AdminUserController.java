package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.AdminUserSummaryResponse;
import com.ahmed.identityservice.dto.MessageResponse;
import com.ahmed.identityservice.dto.UpdateUserRolesRequest;
import com.ahmed.identityservice.dto.UpdateUserStatusRequest;
import com.ahmed.identityservice.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    public ResponseEntity<List<AdminUserSummaryResponse>> getAllUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    public ResponseEntity<AdminUserSummaryResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.getUserById(id));
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminUserSummaryResponse> updateUserRoles(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRolesRequest request) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(adminUserService.updateUserRoles(adminId, id, request));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminUserSummaryResponse> updateUserStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(adminUserService.updateUserStatus(adminId, id, request));
    }

    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    public ResponseEntity<MessageResponse> unlockUser(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(adminUserService.unlockUser(adminId, id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> deleteUser(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        UUID adminId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(adminUserService.deleteUser(adminId, id));
    }
}
