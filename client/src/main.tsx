// Polyfill Buffer for browser environment (needed for PDF generation and other Node.js libraries)
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;
globalThis.global = globalThis;
window.Buffer = Buffer;
window.global = window as any;

import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpSubscriptionLink, splitLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Session token storage key
const SESSION_TOKEN_KEY = "manus-session-token";

// Helper to get session token from localStorage
export function getSessionToken(): string | null {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  console.log('[getSessionToken] Retrieved token:', {
    exists: !!token,
    length: token?.length || 0,
    preview: token ? `${token.substring(0, 20)}...` : 'null'
  });
  return token;
}

// Helper to set session token in localStorage
export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  console.log('[Session] Token stored successfully');
}

// Helper to clear session token from localStorage
export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  console.log('[Session] Token cleared');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 2 minutes - reduces redundant API calls
      staleTime: 2 * 60 * 1000,
      // Cache data for 10 minutes even after component unmounts
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Refetch on reconnect to ensure fresh data
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// CRITICAL FIX: Track if we're already handling an auth error to prevent redirect loops
let isHandlingAuthError = false;

const handleUnauthorizedError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (isHandlingAuthError) {
    console.log('[Auth] Already handling auth error, skipping duplicate handling');
    return;
  }

  // Don't treat job-specific errors as auth errors
  const isJobError = error.message.includes("Lead not found") ||
    error.message.includes("Job not found") ||
    error.message.includes("permission to view") ||
    error.message.includes("permission to edit") ||
    error.message.includes("permission to access");

  if (isJobError) {
    console.log("[Auth] Job-specific error, not redirecting:", error.message);
    return;
  }

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG || 
    error.message.includes("Invalid session") ||
    error.message.includes("UNAUTHORIZED") ||
    error.data?.code === "UNAUTHORIZED";

  if (!isUnauthorized) return;

  // Set flag to prevent multiple simultaneous redirects
  isHandlingAuthError = true;

  // CRITICAL FIX: Check if we have a Supabase session but no CRM session token
  const hasSessionToken = !!getSessionToken();
  
  if (!hasSessionToken) {
    console.error("[Auth] ⚠️  CRITICAL: Unauthorized error but no session token found!");
    console.error("[Auth] This indicates a failed CRM sync. User may be logged into Supabase but not CRM.");
    console.error("[Auth] Attempting automatic session recovery...");
    
    // Attempt to recover session by triggering a re-sync
    // This will be picked up by useSupabaseAuth hook
    window.dispatchEvent(new CustomEvent('auth:recover-session'));
    
    // Show user-friendly error message
    import('sonner').then(({ toast }) => {
      toast.error("Session Error", {
        description: "Please refresh the page or log in again.",
        duration: 5000,
      });
    }).catch(err => {
      console.warn('[Auth] Could not show toast:', err);
    });
    
    // Reset flag after 3 seconds
    setTimeout(() => {
      isHandlingAuthError = false;
    }, 3000);
    
    return;
  }

  // Clear the invalid token to prevent retry loops
  console.warn("[Auth] Unauthorized error - clearing session token");
  clearSessionToken();
  
  // Redirect to login (only if OAuth is configured)
  const loginUrl = getLoginUrl();
  if (loginUrl && loginUrl !== "#") {
    setTimeout(() => {
      window.location.href = loginUrl;
      isHandlingAuthError = false;
    }, 500);
  } else {
    console.warn("[Auth] OAuth not configured, cannot redirect to login");
    isHandlingAuthError = false;
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleUnauthorizedError(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    
    // CRITICAL: Do NOT logout on syncSupabaseUser errors
    // The sync failure should not kill the user's session
    const mutationKey = event.mutation.options.mutationKey;
    const isSyncMutation = mutationKey && 
      Array.isArray(mutationKey) && 
      mutationKey.some(key => typeof key === 'string' && key.includes('syncSupabaseUser'));
    
    if (isSyncMutation) {
      console.warn("[Auth] CRM Sync failed, continuing in offline mode");
      console.error("[API Mutation Error - Non-fatal]", error);
      return; // Don't call handleUnauthorizedError for sync failures
    }
    
    handleUnauthorizedError(error);
    console.error("[API Mutation Error]", error);
  }
});

// Log the API URL being used for debugging
// Ensure the URL ends with /trpc (or /api/trpc for relative paths)
let apiUrl = import.meta.env.VITE_API_URL || "/api/trpc";

// If VITE_API_URL is set but doesn't end with /trpc, append it
if (import.meta.env.VITE_API_URL && !apiUrl.endsWith("/trpc")) {
  // Remove trailing slash if present, then add /api/trpc
  apiUrl = apiUrl.replace(/\/$/, "") + "/api/trpc";
}


const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: httpSubscriptionLink({
        url: () => {
          const token = getSessionToken();
          console.log('[httpSubscriptionLink] Getting URL for subscription:', {
            hasToken: !!token,
            tokenLength: token?.length || 0,
            apiUrl,
          });
          if (token) {
            const urlWithAuth = `${apiUrl}?authorization=Bearer ${encodeURIComponent(token)}`;
            console.log('[httpSubscriptionLink] URL with auth:', urlWithAuth);
            return urlWithAuth;
          }
          console.warn('[httpSubscriptionLink] ⚠️ No token available, using URL without auth');
          return apiUrl;
        },
        transformer: superjson,
        connectionParams() {
          // CRITICAL FIX: Send auth token with subscriptions (AI chat streaming)
          const token = getSessionToken();
          if (token) {
            return {
              authorization: `Bearer ${token}`,
            };
          }
          return {};
        },
      }),
      false: httpBatchLink({
        url: apiUrl,
        transformer: superjson,
        headers() {
          // Send session token as Authorization header for cross-origin requests
          const token = getSessionToken();
          if (token) {
            console.log('[tRPC] Including auth token in request');
            return {
              Authorization: `Bearer ${token}`,
            };
          }
          console.warn('[tRPC] ⚠️  No auth token available for request');
          return {};
        },
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          }).catch(error => {
            console.error("[TRPC Fetch Error]", {
              url: input,
              error: error,
              message: error.message,
              stack: error.stack,
            });
            throw error;
          });
        },
      }),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
