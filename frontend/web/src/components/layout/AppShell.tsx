'use client';

import React from 'react';

/**
 * AppShell: In Phase 15, route groups ((public), (auth), (user), (checkout), (admin))
 * manage their own nested layouts. AppShell is maintained as a pass-through
 * wrapper for backward compatibility.
 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
