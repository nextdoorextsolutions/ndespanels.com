import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Supabase Integration", () => {
  it("should connect to Supabase with valid credentials", async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check environment variables are set
    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseServiceKey).toBeDefined();

    // Create client with service role key for full access
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Test connection by listing buckets (this validates the credentials)
    const { data, error } = await supabase.storage.listBuckets();

    // If there's an error, it should not be an auth error
    if (error) {
      expect(error.message).not.toMatch(/Invalid API key/i);
      expect(error.message).not.toMatch(/Invalid JWT/i);
    }
    
    // Connection successful - data should be an array (possibly empty)
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should have valid URL format", () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Allow trailing slash
    expect(supabaseUrl).toMatch(/^https:\/\/.*\.supabase\.co\/?$/);
  });

  it("should have valid JWT format for keys", () => {
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // JWT format: header.payload.signature
    const jwtRegex = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    
    expect(supabaseAnonKey).toMatch(jwtRegex);
    expect(supabaseServiceKey).toMatch(jwtRegex);
  });
});
