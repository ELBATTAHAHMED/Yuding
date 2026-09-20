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

    @Transactional(readOnly = true)
    public List<AdminUserSummaryResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(AdminUserSummaryResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminUserSummaryResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return AdminUserSummaryResponse.from(user);
    }

    @Transactional
    public AdminUserSummaryResponse updateUserRoles(UUID adminId, UUID targetUserId, UpdateUserRolesRequest request) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        Set<String> oldRoles = user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());
        Set<Role> newRoles = new HashSet<>();

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

        String metadataJson = String.format("{\"oldRoles\":%s,\"newRoles\":%s}",
                oldRoles.toString(), request.roles().toString());

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
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

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
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        user.setStatus(UserStatus.DELETED);
        userRepository.save(user);

        auditService.logAdminAction(
                adminId,
                "USER_DELETE",
                "identity-service",
                "user",
                targetUserId.toString(),
                "User account deleted by admin",
                "{}"
        );

        return new MessageResponse("User deleted successfully");
    }
}
