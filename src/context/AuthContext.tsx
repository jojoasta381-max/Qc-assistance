'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  checkQuota: number;
  quotaUsed: number;
  workspaces?: Array<{ id: string; name: string }>;
}

interface AuthContextType {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (params: {
    email?: string;
    password?: string;
    demoRole?: 'qc_lead' | 'ems_builder' | 'compliance_head';
    isGoogleAuth?: boolean;
    name?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signup: (params: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    phone?: string;
    role?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user && data.tenant) {
          setUser(data.user);
          setTenant(data.tenant);
        } else {
          setUser(null);
          setTenant(null);
        }
      }
    } catch (err) {
      console.error('Failed to verify session:', err);
      setUser(null);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (params: {
    email?: string;
    password?: string;
    demoRole?: 'qc_lead' | 'ems_builder' | 'compliance_head';
    isGoogleAuth?: boolean;
    name?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      setUser(data.user);
      setTenant(data.tenant);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during login.' };
    }
  };

  const signup = async (params: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    phone?: string;
    role?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Signup failed.' };
      }

      setUser(data.user);
      setTenant(data.tenant);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during signup.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setTenant(null);
    }
  };

  const refresh = async () => {
    await fetchSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
