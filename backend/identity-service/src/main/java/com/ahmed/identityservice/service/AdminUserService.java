package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.AdminUserSummaryResponse;
import com.ahmed.identityservice.dto.MessageResponse;
import com.ahmed.identityservice.dto.UpdateUserRolesRequest;
import com.ahmed.identityservice.dto.UpdateUserStatusRequest;
import com.ahmed.identityservice.exception.ResourceNotFoundException;
import com.ahmed.identityservice.model.Role;
import com.ahmed.identityservice.model.User;
import com.ahmed.identityservice.model.UserStatus;
import com.ahmed.identityservice.repository.RoleRepository;
import com.ahmed.identityservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final ProfileService profileService;

    private static int rolePriority(Set<String> roles) {
        if (roles == null || roles.isEmpty()) return 99;
        if (roles.contains("ROLE_ADMIN")) return 1;
        if (roles.contains("ROLE_SUPPORT")) return 2;
        if (roles.contains("ROLE_CONTENT_MANAGER")) return 3;
        return 10;
    }

    @Transactional(readOnly = true)
    public List<AdminUserSummaryResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(AdminUserSummaryResponse::from)
                .sorted(Comparator.comparingInt((AdminUserSummaryResponse u) -> rolePriority(u.roles()))
                        .thenComparing(AdminUserSummaryResponse::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminUserSummaryResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return AdminUserSummaryResponse.from(user);
    }

    @Transactional(readOnly = true)
    public byte[] getUserPhoto(UUID id) throws java.io.IOException {
        return profileService.photo(id);
    }

    @Transactional(readOnly = true)
    public String getUserPhotoKey(UUID id) {
        return profileService.photoKey(id);
    }

    @Transactional
    public AdminUserSummaryResponse updateUserRoles(UUID adminId, UUID targetUserId, UpdateUserRolesRequest request) {
        if (!Set.of("ROLE_USER","ROLE_ADMIN","ROLE_SUPPORT","ROLE_CONTENT_MANAGER").containsAll(request.roles())) {
            throw new IllegalArgumentException("Rôle inconnu.");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        Set<String> oldRoles = user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());
        Set<Role> newRoles = new HashSet<>();

        // Prevent self-demotion from ROLE_ADMIN
        if (adminId.equals(targetUserId) && oldRoles.contains("ROLE_ADMIN") && !request.roles().contains("ROLE_ADMIN")) {
            throw new IllegalArgumentException("Un administrateur ne peut pas retirer son propre rôle ROLE_ADMIN.");
        }

        for (String roleName : request.roles()) {
            Role role = roleRepository.findByName(roleName)
                    .orElseGet(() -> roleRepository.save(Role.builder()
                            .name(roleName)
                            .description("Role " + roleName)
                            .build()));
            newRoles.add(role);
        }

        user.setRoles(newRoles);
        user = userRepository.save(user);

        String metadataJson = new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(
                java.util.Map.of("oldRoles", oldRoles, "newRoles", request.roles())).toString();

        auditService.logAdminAction(
                adminId,
                "ROLE_CHANGE",
                "identity-service",
                "user",
                targetUserId.toString(),
                "Updated user roles from " + oldRoles + " to " + request.roles(),
                metadataJson
        );

        return AdminUserSummaryResponse.from(user);
    }

    @Transactional
    public AdminUserSummaryResponse updateUserStatus(UUID adminId, UUID targetUserId, UpdateUserStatusRequest request) {
        if (adminId.equals(targetUserId) && request.status() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("Un administrateur ne peut pas désactiver son propre compte.");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        if (request.status() == UserStatus.DELETED) {
            throw deletionUnavailable(user);
        }

        UserStatus oldStatus = user.getStatus();
        user.setStatus(request.status());
        user = userRepository.save(user);

        String metadataJson = String.format("{\"oldStatus\":\"%s\",\"newStatus\":\"%s\"}",
                oldStatus, request.status());

        auditService.logAdminAction(
                adminId,
                "USER_STATUS_CHANGE",
                "identity-service",
                "user",
                targetUserId.toString(),
                "Changed user status from " + oldStatus + " to " + request.status(),
                metadataJson
        );

        return AdminUserSummaryResponse.from(user);
    }

    @Transactional
    public MessageResponse unlockUser(UUID adminId, UUID targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        auditService.logAdminAction(
                adminId,
                "ACCOUNT_UNLOCK",
                "identity-service",
                "user",
                targetUserId.toString(),
                "Account unlocked by admin/support",
                "{}"
        );

        return new MessageResponse("User account unlocked successfully");
    }

    @Transactional
    public MessageResponse deleteUser(UUID adminId, UUID targetUserId) {
        if (adminId.equals(targetUserId)) {
            throw new IllegalArgumentException("Un administrateur ne peut pas supprimer ou désactiver son propre compte.");
        }

        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        throw deletionUnavailable(user);
    }

    private org.springframework.web.server.ResponseStatusException deletionUnavailable(User user) {
        if (user.getRoles().stream().anyMatch(role -> "ROLE_ADMIN".equals(role.getName()))) {
            return new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Les comptes administrateurs ne peuvent pas être supprimés.");
        }
        return new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "Suppression indisponible : la vérification des données liées n’est pas encore disponible.");
    }

    @Transactional(readOnly = true)
    public List<com.ahmed.identityservice.dto.AdminActionResponse> getAuditLogs(int limit) {
        return auditService.getAdminActions(limit);
    }
}
