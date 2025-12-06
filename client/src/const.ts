export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Check if a URL string is valid
function isValidUrl(urlString: string | undefined): boolean {
  if (!urlString) return false;
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  // Return empty string if OAuth is not configured
  if (!isValidUrl(oauthPortalUrl) || !appId) {
    console.warn("[Auth] OAuth not configured. Login will not work.",
      "\n  VITE_OAUTH_PORTAL_URL:", oauthPortalUrl ? (isValidUrl(oauthPortalUrl) ? "✓ Valid" : "✗ Invalid URL") : "✗ Missing",
      "\n  VITE_APP_ID:", appId ? "✓ Present" : "✗ Missing"
    );
    return "#";
  }
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
