import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

interface TenantContextValue {
  tenantSlug: string | null;
  tenantName: string | null;
  barrierxUserId: string | null;
  hubspotOwnerId: string | null;
  isReady: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export const useTenant = (): TenantContextValue => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const value = useMemo<TenantContextValue>(() => ({
    tenantSlug: user?.tenantSlug ?? null,
    tenantName: user?.tenantName ?? null,
    barrierxUserId: user?.barrierxUserId ?? null,
    hubspotOwnerId: user?.hubspotOwnerId ?? null,
    isReady: !!user?.tenantSlug,
  }), [user?.tenantSlug, user?.tenantName, user?.barrierxUserId, user?.hubspotOwnerId]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};
