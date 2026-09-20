'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { authService } from '@/services/auth.service';
import { LoginRequest, RegisterRequest, UserProfile } from '@/types/auth.types';

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  isContentManager: boolean;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  hasRole: (role: string) => boolean;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reloadProfile = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  };

  useEffect(() => {
    // Attempt silent session restoration on app initialization via HttpOnly cookie
    let isMounted = true;
    async function restoreSession() {
      try {
        const token = await authService.refresh();
        if (token && isMounted) {
          setAccessToken(token);
          const profile = await authService.getMe();
          if (isMounted) {
            setUser(profile);
          }
        }
      } catch {
        // Unauthenticated session
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (request: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(request);
      setAccessToken(response.accessToken);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (request: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(request);
      setAccessToken(response.accessToken);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const logoutAll = async () => {
    try {
      await authService.logoutAll();
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const isAdmin = useMemo(() => hasRole('ROLE_ADMIN'), [user]);
  const isSupport = useMemo(() => hasRole('ROLE_SUPPORT'), [user]);
  const isContentManager = useMemo(() => hasRole('ROLE_CONTENT_MANAGER'), [user]);
  const isAuthenticated = useMemo(() => !!user, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated,
        isAdmin,
        isSupport,
        isContentManager,
        login,
        register,
        logout,
        logoutAll,
        hasRole,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
