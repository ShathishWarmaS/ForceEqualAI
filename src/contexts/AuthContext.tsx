'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; validationErrors?: any[] }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  sessionExpiry: number | null;
  isSessionValid: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Decode JWT to get expiration time
  const decodeToken = (token: string): { exp?: number } => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return {};
    }
  };

  const isSessionValid = (): boolean => {
    if (!token || !sessionExpiry) return false;
    return Date.now() < sessionExpiry * 1000; // Convert to milliseconds
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    setSessionExpiry(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiry');
  };

  // Auto-logout when session expires
  useEffect(() => {
    if (!isSessionValid() && token) {
      console.log('Session expired, logging out...');
      clearSession();
      // Optional: Show notification to user
    }
  }, [token, sessionExpiry]);

  // Check session validity periodically
  useEffect(() => {
    const checkSession = setInterval(() => {
      if (token && !isSessionValid()) {
        console.log('Session expired during periodic check');
        clearSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkSession);
  }, [token, sessionExpiry]);

  useEffect(() => {
    // Check for existing token in localStorage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedExpiry = localStorage.getItem('sessionExpiry');
    
    if (savedToken && savedUser && savedExpiry) {
      const expiry = parseInt(savedExpiry);
      
      // Check if session is still valid
      if (Date.now() < expiry * 1000) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setSessionExpiry(expiry);
      } else {
        // Clear expired session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionExpiry');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; validationErrors?: any[] }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.status === 429) {
        return { 
          success: false, 
          error: data.error || 'Too many login attempts. Please try again later.' 
        };
      }

      if (response.status === 400 && data.validationErrors) {
        return {
          success: false,
          error: data.error || 'Invalid input',
          validationErrors: data.validationErrors
        };
      }

      if (data.success) {
        const tokenPayload = decodeToken(data.token);
        const expiry = tokenPayload.exp || Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24h fallback
        
        setToken(data.token);
        setUser(data.user);
        setSessionExpiry(expiry);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('sessionExpiry', expiry.toString());
        
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (data.success) {
        const tokenPayload = decodeToken(data.token);
        const expiry = tokenPayload.exp || Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        
        setToken(data.token);
        setUser(data.user);
        setSessionExpiry(expiry);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('sessionExpiry', expiry.toString());
        
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      isLoading,
      sessionExpiry,
      isSessionValid,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}