import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { trpc } from "@/lib/trpc";
import { setSessionToken, clearSessionToken } from "@/main";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
  crmUser: { id: number; name: string | null; role: string | null; email: string | null } | null;
}

export interface UseSupabaseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
}

// Helper function to get user-friendly error messages
function getReadableErrorMessage(error: AuthError | any): string {
  const errorMessage = error?.message?.toLowerCase() || "";
  const errorCode = error?.code || "";
  
  // Check for specific Supabase error codes and messages
  if (errorCode === "invalid_credentials" || errorMessage.includes("invalid login credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  
  if (errorMessage.includes("email not confirmed")) {
    return "Please verify your email address before logging in.";
  }
  
  if (errorMessage.includes("user not found") || errorMessage.includes("no user found")) {
    return "No account found with this email address.";
  }
  
  if (errorMessage.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  
  if (errorMessage.includes("password") && errorMessage.includes("short")) {
    return "Password is too short. Please use at least 6 characters.";
  }
  
  if (errorMessage.includes("rate limit") || errorMessage.includes("too many requests")) {
    return "Too many login attempts. Please wait a few minutes and try again.";
  }
  
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  // Return the original message if no specific match
  return error?.message || "An unexpected error occurred. Please try again.";
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    crmUser: null,
  });

  const syncUserMutation = trpc.auth.syncSupabaseUser.useMutation();

  // Function to sync Supabase user to CRM and store session token
  const syncToCRM = useCallback(async (supabaseUser: User) => {
    try {
      const result = await syncUserMutation.mutateAsync({
        supabaseUserId: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0],
      });
      
      if (result.success && result.user) {
        // Store the session token returned from the backend
        if ((result as any).sessionToken) {
          setSessionToken((result as any).sessionToken);
        }
        
        setState(prev => ({
          ...prev,
          crmUser: result.user,
        }));
      }
      
      return result;
    } catch (error) {
      console.error("[Auth] Failed to sync user to CRM:", error);
      return null;
    }
  }, [syncUserMutation]);

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseAvailable() || !supabase) {
      console.warn("[Auth] Supabase is not configured. Authentication will not work.");
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Get initial session with timeout fallback
    const sessionTimeout = setTimeout(() => {
      // If getSession takes too long, assume no session and show login form
      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        loading: false,
        error: null,
      }));
    }, 2000); // 2 second timeout

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        clearTimeout(sessionTimeout);
        
        if (session?.user) {
          // Sync to CRM on initial load if authenticated
          await syncToCRM(session.user);
        }
        
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
          error: error ?? null,
        }));
      })
      .catch((err) => {
        clearTimeout(sessionTimeout);
        console.error("[Auth] Failed to get session:", err);
        // On error, assume no session and show login form
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          loading: false,
          error: null,
        }));
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user && _event === "SIGNED_IN") {
          // Sync to CRM when user signs in
          await syncToCRM(session.user);
        }
        
        if (_event === "SIGNED_OUT") {
          // Clear session token on sign out
          clearSessionToken();
        }
        
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
          crmUser: session ? prev.crmUser : null,
        }));
      }
    );

    return () => {
      clearTimeout(sessionTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Check if Supabase is configured
    if (!isSupabaseAvailable() || !supabase) {
      console.error("[Auth] Supabase client is not available");
      return { 
        error: { 
          message: "Authentication service is not configured. Please contact support.",
          name: "ConfigurationError",
          status: 500
        } as AuthError 
      };
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Convert to user-friendly error message
        const readableError = {
          ...error,
          message: getReadableErrorMessage(error)
        } as AuthError;
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: readableError,
        }));
        
        return { error: readableError };
      }

      if (data.user) {
        // Sync to CRM after successful login
        await syncToCRM(data.user);
      }

      setState(prev => ({
        ...prev,
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      }));

      return { error: null };
    } catch (err: any) {
      console.error("[Auth] Sign in error:", err);
      const readableError = {
        message: getReadableErrorMessage(err),
        name: "AuthError",
        status: 500
      } as AuthError;
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: readableError,
      }));
      
      return { error: readableError };
    }
  }, [syncToCRM]);

  const signOut = useCallback(async () => {
    if (!isSupabaseAvailable() || !supabase) return;

    setState(prev => ({ ...prev, loading: true }));
    
    // Clear session token from localStorage
    clearSessionToken();
    
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      loading: false,
      error: null,
      crmUser: null,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { 
        error: { 
          message: "Authentication service is not configured. Please contact support.",
          name: "ConfigurationError",
          status: 500
        } as AuthError 
      };
    }

    // Get the current origin for the redirect URL
    const redirectTo = `${window.location.origin}/reset-password`;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        return { 
          error: {
            ...error,
            message: getReadableErrorMessage(error)
          } as AuthError 
        };
      }

      return { error: null };
    } catch (err: any) {
      return { 
        error: {
          message: getReadableErrorMessage(err),
          name: "AuthError",
          status: 500
        } as AuthError 
      };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { 
        error: { 
          message: "Authentication service is not configured. Please contact support.",
          name: "ConfigurationError",
          status: 500
        } as AuthError 
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { 
          error: {
            ...error,
            message: getReadableErrorMessage(error)
          } as AuthError 
        };
      }

      return { error: null };
    } catch (err: any) {
      return { 
        error: {
          message: getReadableErrorMessage(err),
          name: "AuthError",
          status: 500
        } as AuthError 
      };
    }
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
