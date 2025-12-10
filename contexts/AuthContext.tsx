import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export type UserType = 'individual' | 'corporate' | null;
export type AuthState = {
  isAuthenticated: boolean;
  userType: UserType;
  userEmail: string | null;
  userData: {
    talents?: string[];
    sector?: string;
  } | null;
};

type AuthContextType = {
  authState: AuthState;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  logout: () => void;
  setUserData: (data: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// State'i component dışında tutarak yeniden mount'ta korunmasını sağla
let globalAuthState: AuthState = {
  isAuthenticated: false,
  userType: null,
  userEmail: null,
  userData: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(globalAuthState);

  const login = async (email: string, password: string) => {
    // TODO: API call yapılacak
    // Şimdilik mock login
    const newState = {
      isAuthenticated: true,
      userType: 'individual' as UserType,
      userEmail: email,
      userData: null,
    };
    globalAuthState = newState;
    setAuthState(newState);
  };

  const signup = async (email: string, password: string, username: string, fullName: string) => {
    // TODO: API call yapılacak
    // Şimdilik mock signup
    const newState = {
      isAuthenticated: true,
      userType: 'individual' as UserType,
      userEmail: email,
      userData: {
        username,
        fullName,
      },
    };
    globalAuthState = newState;
    setAuthState(newState);
  };

  const logout = () => {
    const newState = {
      isAuthenticated: false,
      userType: null,
      userEmail: null,
      userData: null,
    };
    globalAuthState = newState;
    setAuthState(newState);
  };

  const setUserData = (data: any) => {
    const newState = {
      ...authState,
      userData: data,
    };
    globalAuthState = newState;
    setAuthState(newState);
  };

  const value = useMemo(
    () => ({ authState, login, signup, logout, setUserData }),
    [authState]
  );

  return (
    <AuthContext.Provider value={value}>
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


