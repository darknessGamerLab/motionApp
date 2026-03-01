import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type UserType = 'individual' | 'corporate' | null;

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userType: UserType;
  userEmail: string | null;
  userData: {
    username?: string;
    fullName?: string;
    talents?: string[];
    sector?: string;
  } | null;
};

type CorporateApplicationData = {
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  phone: string;
};

type AuthContextType = {
  authState: AuthState;
  // Legacy methods (for backward compatibility during transition)
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, userType: UserType, userData?: any) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  setUserData: (data: any) => void;
  completeAuth: () => void;
  // New Supabase methods
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  submitCorporateApplication: (data: CorporateApplicationData) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null,
    profile: null,
    userType: null,
    userEmail: null,
    userData: null,
  });

  // Initialize auth state from Supabase session
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (event === 'SIGNED_IN' && session) {
        await handleSession(session);
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          profile: null,
          userType: null,
          userEmail: null,
          userData: null,
        });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setAuthState(prev => ({ ...prev, session }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle session and fetch profile
  const handleSession = async (session: Session) => {
    const user = session.user;

    // Fetch profile from database
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user,
      session,
      profile: profile || null,
      userType: profile?.user_type || null,
      userEmail: user.email || null,
      userData: profile ? {
        username: profile.username,
        fullName: profile.full_name,
        talents: profile.talents,
      } : null,
    });
  };

  // Refresh profile from database
  const refreshProfile = async () => {
    if (!authState.user) return;
    console.log('Refreshing profile for user:', authState.user.id);

    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', authState.user.id)
      .single();

    if (error) {
      console.error('Refresh profile error:', error);
      return;
    }

    if (profile) {
      console.log('Profile refreshed, new type:', profile.user_type);
      setAuthState(prev => ({
        ...prev,
        profile,
        userType: profile.user_type,
        userData: {
          username: profile.username,
          fullName: profile.full_name,
          talents: profile.talents,
        },
      }));
    }
  };

  // Email/Password Login
  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'E-posta veya şifre hatalı' };
        }
        return { error: error.message };
      }

      // Session will be handled by onAuthStateChange
      setTimeout(() => router.replace('/'), 100);
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Giriş yapılırken bir hata oluştu' };
    }
  };

  // Email/Password Signup
  const signup = async (
    email: string,
    password: string,
    userType: UserType,
    userData?: any
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: userData?.username,
            full_name: userData?.fullName,
            user_type: userType,
            talents: userData?.talents || [],
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { error: 'Bu e-posta adresi zaten kayıtlı' };
        }
        return { error: error.message };
      }

      // If email confirmation is disabled, user is signed in immediately
      if (data.session) {
        setTimeout(() => router.replace('/'), 100);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Kayıt olurken bir hata oluştu' };
    }
  };

  // Google Sign-In
  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'motionapp://auth/callback',
        },
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Google ile giriş yapılırken bir hata oluştu' };
    }
  };

  // Apple Sign-In
  const signInWithApple = async (): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'motionapp://auth/callback',
        },
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Apple ile giriş yapılırken bir hata oluştu' };
    }
  };

  // Reset Password
  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'motionapp://auth/reset-password',
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu' };
    }
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  // Update Profile
  const updateProfile = async (data: Partial<Profile>): Promise<{ error: string | null }> => {
    if (!authState.user) return { error: 'Kullanıcı oturumu bulunamadı' };

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update(data)
        .eq('id', authState.user.id);

      if (error) return { error: error.message };

      await refreshProfile();
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Profil güncellenirken bir hata oluştu' };
    }
  };

  // Check username availability
  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (error) return false;

    // If data exists, username is taken (unless it's the current user)
    if (data && authState.user && data.id === authState.user.id) {
      return true; // User's own username
    }

    return !data;
  };

  // Submit corporate account application
  const submitCorporateApplication = async (data: CorporateApplicationData): Promise<{ error: string | null }> => {
    if (!authState.user || !authState.userEmail) {
      return { error: 'Kullanıcı oturumu bulunamadı' };
    }

    try {
      // Save application to Supabase
      const { error: dbError } = await (supabase as any)
        .from('corporate_applications')
        .insert({
          user_id: authState.user.id,
          user_email: authState.userEmail,
          company_name: data.companyName,
          tax_office: data.taxOffice,
          tax_number: data.taxNumber,
          phone: data.phone,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('corporate_applications table error:', dbError.message);
        return { error: 'Başvuru kaydedilirken bir hata oluştu: ' + dbError.message };
      }

      // Send notification email via Supabase Edge Function or SMTP
      // For now, we log — in production integrate with an email service
      console.log('Corporate application submitted:', {
        ...data,
        userEmail: authState.userEmail,
        userId: authState.user.id,
      });

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Başvuru gönderilirken bir hata oluştu' };
    }
  };

  // Legacy methods for backward compatibility
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
    setTimeout(() => router.replace('/'), 50);
  };

  return (
    <AuthContext.Provider value={{
      authState,
      login,
      signup,
      logout,
      setUserData,
      completeAuth,
      signInWithGoogle,
      signInWithApple,
      resetPassword,
      updateProfile,
      refreshProfile,
      checkUsernameAvailable,
      submitCorporateApplication,
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
