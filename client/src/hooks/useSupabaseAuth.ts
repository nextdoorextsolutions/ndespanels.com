import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

export interface UseSupabaseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!isSupabaseAvailable() || !supabase) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: error ?? null,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }));
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { error: { message: "Supabase not available" } as AuthError };
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setState(prev => ({
      ...prev,
      user: data.user,
      session: data.session,
      loading: false,
      error,
    }));

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseAvailable() || !supabase) return;

    setState(prev => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      loading: false,
      error: null,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { error: { message: "Supabase not available" } as AuthError };
    }

    // Get the current origin for the redirect URL
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { error: { message: "Supabase not available" } as AuthError };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!state.session,
  };
}
