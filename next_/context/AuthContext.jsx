"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signupApi, loginApi, loginOtpApi, fetchCurrentUserApi } from '@/lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [guestId, setGuestId] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('fylexx_user');
    localStorage.removeItem('fylexx_token');
  }, []);

  const persistSession = useCallback((token, userData) => {
    setUser(userData);
    localStorage.setItem('fylexx_user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('fylexx_token', token);
    }
    return userData;
  }, []);

  const verifySession = useCallback(async () => {
    const token = localStorage.getItem('fylexx_token');
    if (!token) {
      clearSession();
      return null;
    }

    const result = await fetchCurrentUserApi();

    if (!result?.success || !result?.data?.user) {
      clearSession();
      return null;
    }

    return persistSession(token, result.data.user);
  }, [clearSession, persistSession]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const verifiedUser = await verifySession();
      if (mounted) {
        setUser(verifiedUser);
        setLoading(false);
      }
    };

    void bootstrap();

    let gid = localStorage.getItem('fylexx_guest_id');
    if (!gid) {
      gid = `gst_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      localStorage.setItem('fylexx_guest_id', gid);
    }
    setGuestId(gid);

    return () => {
      mounted = false;
    };
  }, [verifySession]);

  const login = async (credentials) => {
    const result = await loginApi(credentials);

    if (!result?.success) {
      clearSession();
      throw new Error(result?.error || 'Something went wrong');
    }

    const payload = result.data;
    const loginSucceeded = result?.success === true;
    if (!loginSucceeded || !payload?.access_token || !payload?.user) {
      clearSession();
      throw new Error('Invalid login response from server');
    }

    return persistSession(payload.access_token, payload.user);
  };

  const loginOtp = async (credentials) => {
    const result = await loginOtpApi(credentials);

    if (!result?.success) {
      clearSession();
      throw new Error(result?.error || 'Something went wrong');
    }

    const payload = result.data;
    if (!payload?.access_token || !payload?.user) {
      clearSession();
      throw new Error('Invalid login response from server');
    }

    return persistSession(payload.access_token, payload.user);
  };

  const logout = () => {
    clearSession();
  };

  const signup = async (userData) => {
    const result = await signupApi(userData);

    if (!result?.success) {
      throw new Error(result?.error || 'Something went wrong');
    }

    const payload = result.data;
    if (payload?.access_token && payload?.user) {
      persistSession(payload.access_token, payload.user);
    }

    return result.data;
  };

  return (
    <AuthContext.Provider value={{ user, guestId, login, loginOtp, logout, signup, loading, verifySession, setSession: persistSession, isAuthenticated: !!user }}>
      {!loading && children}
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
