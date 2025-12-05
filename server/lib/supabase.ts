import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key (full access)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Single storage bucket for all CRM files
export const STORAGE_BUCKET = "CRM files";

// Upload file to Supabase Storage
export async function uploadToSupabase(
  path: string,
  file: Buffer | Uint8Array,
  contentType: string
): Promise<{ url: string; path: string } | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    return null;
  }

  // Get public URL since bucket has public access policy
  const { data: urlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

// Get public URL for a file
export function getPublicUrl(path: string): string {
  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

// Get signed URL for a file (for private access if needed)
export async function getSignedUrl(
  path: string,
  expiresIn: number = 60 * 60 // 1 hour default
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Supabase signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}

// Delete file from Supabase Storage
export async function deleteFromSupabase(path: string): Promise<boolean> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Supabase delete error:", error);
    return false;
  }

  return true;
}

// List files in a folder
export async function listFiles(
  folder: string = ""
): Promise<{ name: string; id: string; metadata: any }[]> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .list(folder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("Supabase list error:", error);
    return [];
  }

  return data || [];
}

// No initialization needed - bucket already exists with RLS policies
export async function initializeStorageBuckets() {
  // Bucket 'crm-files' already created manually with RLS policies
  console.log("Using existing Supabase bucket: crm-files");
}
