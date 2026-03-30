/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';
import { authService } from '../services/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const storedAuth = authService.getStoredAuth();
  const [session, setSession] = useState(storedAuth);

  const login = async (credentials) => {
    const payload = await authService.login(credentials);
    setSession(payload);
    return payload;
  };

  const register = async (payload) => {
    const user = await authService.register(payload);
    return user;
  };

  const logout = () => {
    authService.logout();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.user),
      login,
      register,
      logout,
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
