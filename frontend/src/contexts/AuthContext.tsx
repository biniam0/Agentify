import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User, barrierxRefreshToken?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });
  const validatingRef = useRef(false);

  const setAuth = (user: User | null) => {
    setState({ user, loading: false, isAuthenticated: !!user });
  };

  const login = useCallback((token: string, user: User, barrierxRefreshToken?: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (barrierxRefreshToken) {
      localStorage.setItem('barrierxRefreshToken', barrierxRefreshToken);
    }
    setAuth(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('barrierxRefreshToken');
    setAuth(null);
  }, []);

  const validateSession = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuth(null);
      return;
    }

    if (validatingRef.current) return;
    validatingRef.current = true;

    try {
      const res = await api.get('/user/me');
      if (res.data?.success && res.data.user) {
        const serverUser = res.data.user as User;
        localStorage.setItem('user', JSON.stringify(serverUser));
        setAuth(serverUser);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      validatingRef.current = false;
    }
  }, [logout]);

  const refreshUser = useCallback(async () => {
    await validateSession();
  }, [validateSession]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  useEffect(() => {
    const onFocus = () => {
      if (localStorage.getItem('authToken')) {
        validateSession();
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'authToken' && !e.newValue) {
        setAuth(null);
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [validateSession]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
