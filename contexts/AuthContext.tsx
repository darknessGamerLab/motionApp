import { queryCache } from '@/lib/queryCache';
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
    // ── CRITICAL FIX: Ungate rendering from profile fetch ──
    // Step 1: read session (AsyncStorage, fast)
    // Step 2: immediately unlock app with session data
    // Step 3: fetch full profile in background (non-blocking)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__) console.log('[Auth] event:', event);

      if (event === 'SIGNED_IN' && session) {
        await handleSession(session);
      } else if (event === 'SIGNED_OUT') {
        // FIX 2.3: Clear in-memory query cache on logout.
        // Prevents next user on this device from seeing stale cached data.
        queryCache.clear();
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
        // Only update session reference, do NOT re-fetch profile
        setAuthState(prev => ({ ...prev, session }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle session — UNGATED from profile fetch
  const handleSession = async (session: Session) => {
    const user = session.user;

    // ── PHASE 1: Immediately unlock app. No DB wait. ──
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: true,
      isLoading: false,  // ← splash hides HERE, not after DB
      user,
      session,
      userEmail: user.email || null,
      // Keep any previously cached profile if available
      profile: prev.profile,
      userType: prev.userType,
      userData: prev.userData,
    }));

    // ── PHASE 2: Fetch profile in background (non-blocking) ──
    // Using only the columns we actually need (not SELECT *)
    try {
      const { data: profile, error } = await (supabase as any)
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatars, user_type, talents, is_banned, tax_office, tax_number, bio, created_at, followers_count, following_count, videos_count, radars_count')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (__DEV__) console.error('[Auth] Profile fetch error:', error);
      }

      if (profile) {
        setAuthState(prev => ({
          ...prev,
          profile,
          userType: profile.user_type || null,
          userData: {
            username: profile.username,
            fullName: profile.full_name,
            talents: profile.talents,
          },
        }));
        // ✅ DÜZELDİ: last_seen_at doğrudan güncelle (bio hack'i kaldırıldı)
        (supabase as any).from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id)
          .then(() => { }); // fire-and-forget
      }
    } catch (e) {
      if (__DEV__) console.error('[Auth] Background profile fetch failed:', e);
    }
  };

  // ─── refreshProfile — throttle: 30 saniyede bir çalışır (focus event’de gereksiz DB sorgusu önler)
  const lastRefreshRef = React.useRef<number>(0);
  const refreshProfile = async (force = false) => {
    if (!authState.user) return;
    const now = Date.now();
    if (!force && now - lastRefreshRef.current < 30_000) return; // 30sn cooldown
    lastRefreshRef.current = now;

    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('id, username, full_name, avatar_url, avatars, user_type, talents, is_banned, tax_office, tax_number, bio, created_at, followers_count, following_count, videos_count, radars_count')
      .eq('id', authState.user.id)
      .single();

    if (error) {
      if (__DEV__) console.error('[Auth] Refresh profile error:', error);
      return;
    }

    if (profile) {
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

      // Session will be handled by onAuthStateChange → no setTimeout race condition
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
      // onAuthStateChange will fire SIGNED_IN and handle navigation via _layout.tsx
      // No setTimeout needed — router navigation happens in the layout effect

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

      // Corporate application submitted — in production add email notification

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
    // Navigation handled by _layout.tsx useEffect watching authState.isAuthenticated
    router.replace('/');
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
