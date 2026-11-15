package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.UpdateUserStatusRequest;
import com.ahmed.identityservice.model.Role;
import com.ahmed.identityservice.model.User;
import com.ahmed.identityservice.model.UserStatus;
import com.ahmed.identityservice.repository.RoleRepository;
import com.ahmed.identityservice.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminUserDeletionGuardTest {
    private final UserRepository users = mock(UserRepository.class);
    private final AdminUserService service = new AdminUserService(users, mock(RoleRepository.class), mock(AuditService.class), mock(ProfileService.class));
    private final UUID admin = UUID.randomUUID();
    private final UUID target = UUID.randomUUID();

    @Test
    void deletionFailsClosedWhenLinkedDataCannotBeChecked() {
        when(users.findById(target)).thenReturn(Optional.of(User.builder().roles(Set.of(Role.builder().name("ROLE_USER").build())).build()));
        var error = assertThrows(ResponseStatusException.class, () -> service.deleteUser(admin, target));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verify(users, never()).save(any());
    }

    @Test
    void administratorCannotBeDeletedThroughEitherRoute() {
        when(users.findById(target)).thenReturn(Optional.of(User.builder().roles(Set.of(Role.builder().name("ROLE_ADMIN").build())).build()));
        var direct = assertThrows(ResponseStatusException.class, () -> service.deleteUser(admin, target));
        var status = assertThrows(ResponseStatusException.class, () -> service.updateUserStatus(admin, target, new UpdateUserStatusRequest(UserStatus.DELETED)));
        assertEquals(HttpStatus.CONFLICT, direct.getStatusCode());
        assertEquals(HttpStatus.CONFLICT, status.getStatusCode());
        verify(users, never()).save(any());
    }
}
