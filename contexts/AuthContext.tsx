import { router } from 'expo-router';
import React, { createContext, ReactNode, useContext, useState } from 'react';

export type UserType = 'individual' | 'corporate' | null;
export type AuthState = {
  isAuthenticated: boolean;
  userType: UserType;
  userEmail: string | null;
  userData: {
    username?: string;
    fullName?: string;
    talents?: string[];
    sector?: string;
  } | null;
};

type AuthContextType = {
  authState: AuthState;
  login: (email: string, userType: UserType) => void;
  signup: (email: string, userType: UserType, userData?: any) => void;
  logout: () => void;
  setUserData: (data: any) => void;
  completeAuth: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userType: null,
    userEmail: null,
    userData: null,
  });

  const login = (email: string, userType: UserType) => {
    setAuthState({
      isAuthenticated: true,
      userType,
      userEmail: email,
      userData: null,
    });
    // Direkt yönlendir
    setTimeout(() => {
      router.replace('/');
    }, 50);
  };

  const signup = (email: string, userType: UserType, userData?: any) => {
    setAuthState({
      isAuthenticated: false,
      userType,
      userEmail: email,
      userData: userData || null,
    });
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      userType: null,
      userEmail: null,
      userData: null,
    });
    router.replace('/auth/login');
  };

  const setUserData = (data: any) => {
    setAuthState((prev) => ({
      ...prev,
      userData: prev.userData ? { ...prev.userData, ...data } : data,
    }));
  };

  const completeAuth = () => {
    setAuthState((prev) => ({
      ...prev,
      isAuthenticated: true,
    }));
    setTimeout(() => {
      router.replace('/');
    }, 50);
  };

  return (
    <AuthContext.Provider value={{ authState, login, signup, logout, setUserData, completeAuth }}>
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
