import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Supabase Storage Integration", () => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const BUCKET = "CRM files";

  it("should be able to access the crm-files bucket", async () => {
    const { data, error } = await supabase.storage.getBucket(BUCKET);
    
    // Bucket should exist
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.name).toBe(BUCKET);
  });

  it("should be able to upload a test file", async () => {
    const testContent = Buffer.from("test file content " + Date.now());
    const testPath = `test/test-file-${Date.now()}.txt`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(testPath, testContent, {
        contentType: "text/plain",
        upsert: true,
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.path).toBe(testPath);

    // Clean up - delete the test file
    await supabase.storage.from(BUCKET).remove([testPath]);
  });

  it("should be able to get public URL for a file", async () => {
    const testPath = "test/sample.txt";
    
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(testPath);

    expect(data).toBeDefined();
    // Bucket name is URL-encoded in the URL (spaces become %20)
    expect(data.publicUrl).toContain("CRM%20files");
    expect(data.publicUrl).toContain(testPath);
  });

  it("should be able to list files in a folder", async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 10 });

    // Should not error (may be empty)
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
