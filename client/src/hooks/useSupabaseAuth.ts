import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { trpc } from "@/lib/trpc";
import { setSessionToken, clearSessionToken, getSessionToken } from "@/main";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
  crmUser: { id: number; name: string | null; role: string | null; email: string | null } | null;
  crmUserLoading: boolean;
  syncError: Error | null; // Sync error state - doesn't logout user
}

export interface UseSupabaseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
  recoverSession: () => Promise<void>; // NEW: Manual session recovery
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
    crmUserLoading: false,
    syncError: null,
  });

  const syncUserMutation = trpc.auth.syncSupabaseUser.useMutation();
  const isSyncingRef = useRef(false);
  const syncedUserIdRef = useRef<string | null>(null);
  const syncAttemptedRef = useRef<Set<string>>(new Set()); // Track all sync attempts per session
  const hasSyncedThisPageLoad = useRef(false); // Prevent infinite retry loop on page load

  // Function to sync Supabase user to CRM and store session token
  const syncToCRM = useCallback(async (supabaseUser: User, forceSync = false) => {
    // Guard clause: prevent overlapping sync calls
    if (isSyncingRef.current && !forceSync) {
      console.log('[Auth] Sync already in progress, skipping duplicate call for:', supabaseUser.email);
      return null;
    }
    
    // Guard clause: ONE-TIME ATTEMPT - prevent syncing the same user twice per session (unless forced)
    if (!forceSync && syncAttemptedRef.current.has(supabaseUser.id)) {
      console.log('[Auth] User sync already attempted in this session, skipping:', supabaseUser.email);
      
      // CRITICAL FIX: If we have a Supabase session but no CRM session token, force sync
      const existingToken = getSessionToken();
      if (!existingToken) {
        console.warn('[Auth] Missing CRM session token despite successful Supabase auth. Forcing sync...');
        syncAttemptedRef.current.delete(supabaseUser.id); // Clear the attempt flag
      } else {
        return null;
      }
    }
    
    console.log('[Auth] Starting CRM sync for:', supabaseUser.email);
    isSyncingRef.current = true;
    syncAttemptedRef.current.add(supabaseUser.id); // Mark as attempted immediately
    setState(prev => ({ ...prev, crmUserLoading: true, syncError: null }));
    
    try {
      const result = await syncUserMutation.mutateAsync({
        supabaseUserId: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0],
      });
      
      if (result.success && result.user) {
        // CRITICAL FIX: Store the session token returned from the backend
        if ((result as any).sessionToken) {
          setSessionToken((result as any).sessionToken);
          console.log('[Auth] ✅ Session token stored in localStorage');
        } else {
          console.error('[Auth] ⚠️  WARNING: Backend did not return session token');
        }
        
        console.log('[Auth] CRM sync complete. User role:', result.user.role);
        syncedUserIdRef.current = supabaseUser.id; // Mark user as successfully synced
        setState(prev => ({
          ...prev,
          crmUser: result.user,
          crmUserLoading: false,
          syncError: null,
        }));
      } else {
        console.error('[Auth] Sync succeeded but no user data returned');
        setState(prev => ({ ...prev, crmUserLoading: false }));
      }
      
      return result;
    } catch (error: any) {
      console.error("[Auth] Failed to sync user to CRM:", error);
      
      // CRITICAL: DO NOT logout user on sync failure
      // Set error state and show toast, but keep user authenticated
      const syncError = new Error(
        error?.message || "Connection issue - working in offline mode"
      );
      
      setState(prev => ({ 
        ...prev, 
        crmUserLoading: false,
        syncError, // Set error state without clearing session
      }));
      
      // Show user-friendly toast notification
      if (typeof window !== 'undefined') {
        // Dynamic import to avoid circular dependencies
        import('sonner').then(({ toast }) => {
          toast.error("Connection Issue", {
            description: "Working in offline mode. Some features may be limited.",
          });
        }).catch(err => {
          console.warn('[Auth] Could not show toast:', err);
        });
      }
      
      return null;
    } finally {
      isSyncingRef.current = false; // Always reset syncing flag
    }
  }, [syncUserMutation]);

  // NEW: Manual session recovery function
  const recoverSession = useCallback(async () => {
    if (!isSupabaseAvailable() || !supabase) {
      console.warn('[Auth] Cannot recover session - Supabase not available');
      return;
    }
    
    try {
      console.log('[Auth] Attempting session recovery...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Auth] Session recovery failed:', error);
        return;
      }
      
      if (session?.user) {
        console.log('[Auth] Session recovered, syncing to CRM...');
        await syncToCRM(session.user, true); // Force sync even if already attempted
      } else {
        console.warn('[Auth] No active session to recover');
      }
    } catch (err) {
      console.error('[Auth] Error during session recovery:', err);
    }
  }, [syncToCRM]);

  useEffect(() => {
    let mounted = true;

    // Check if authentication service is configured
    if (!isSupabaseAvailable() || !supabase) {
      console.warn("[Auth] Authentication service is not configured.");
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const checkSession = async () => {
      // ONE-TIME SYNC: Prevent retry loop on page load
      if (hasSyncedThisPageLoad.current) {
        console.log('[Auth] Sync already attempted this page load, skipping');
        return;
      }
      // Safety valve: Force show login form after 500ms if no response
      const sessionTimeout = setTimeout(() => {
        if (mounted) {
          setState(prev => ({
            ...prev,
            user: null,
            session: null,
            loading: false,
            error: null,
          }));
        }
      }, 500); // 500ms timeout - login form MUST appear quickly

      try {
        // Only check Supabase session (fast, client-side)
        if (!supabase) {
          clearTimeout(sessionTimeout);
          if (mounted) {
            setState(prev => ({ ...prev, loading: false }));
          }
          return;
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(sessionTimeout);
        
        if (!mounted) return;

        if (session?.user) {
          // We have a session - set it immediately
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            loading: false,
            error: error ?? null,
          }));
          
          // Mark that we've attempted sync for this page load
          hasSyncedThisPageLoad.current = true;
          
          // Sync to backend - WAIT for it to complete so crmUser is available
          await syncToCRM(session.user);
        } else {
          // No session - show login form immediately
          setState(prev => ({
            ...prev,
            user: null,
            session: null,
            loading: false,
            error: error ?? null,
          }));
        }
      } catch (err) {
        clearTimeout(sessionTimeout);
        console.error("[Auth] Failed to get session:", err);
        
        if (mounted) {
          // On error, show login form immediately
          setState(prev => ({
            ...prev,
            user: null,
            session: null,
            loading: false,
            error: null,
          }));
        }
      }
    };

    checkSession();

    // Listen for auth changes
    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user && _event === "SIGNED_IN") {
          // Only sync if not already synced (prevents double sync on mount)
          if (syncedUserIdRef.current !== session.user.id) {
            await syncToCRM(session.user);
          }
        }
        
        if (_event === "SIGNED_OUT") {
          // Clear session token and reset ALL sync tracking
          clearSessionToken();
          syncedUserIdRef.current = null;
          syncAttemptedRef.current.clear(); // Clear attempt tracking on logout
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
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Check if authentication service is configured
    if (!isSupabaseAvailable() || !supabase) {
      console.error("[Auth] Authentication service is not available");
      return { 
        error: { 
          message: "Authentication service is temporarily unavailable. Please try again later or contact support.",
          name: "ServiceError",
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

      // Sync to CRM after successful login and wait for it
      if (data.user) {
        await syncToCRM(data.user, true); // Force sync on explicit login
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
    
    // Reset sync tracking on manual logout
    syncedUserIdRef.current = null;
    syncAttemptedRef.current.clear();
    
    setState({
      user: null,
      session: null,
      loading: false,
      error: null,
      crmUser: null,
      crmUserLoading: false,
      syncError: null,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { 
        error: { 
          message: "Authentication service is temporarily unavailable. Please try again later or contact support.",
          name: "ServiceError",
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
          message: "Authentication service is temporarily unavailable. Please try again later or contact support.",
          name: "ServiceError",
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
    recoverSession, // NEW: Expose session recovery
    isAuthenticated: !!state.session,
  };
}
