package com.ahmed.identityservice.model;

/**
 * Lifecycle status of a Yuding user account.
 * Corresponds to CHECK constraint in identity.users: ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED').
 */
public enum UserStatus {
    PENDING,
    ACTIVE,
    SUSPENDED,
    DELETED
}
