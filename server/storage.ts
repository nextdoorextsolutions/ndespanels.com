// Storage helpers using Supabase Storage
// Uses the 'crm-files' bucket with public read access

import { 
  uploadToSupabase, 
  getPublicUrl,
  getSignedUrl, 
  deleteFromSupabase,
  initializeStorageBuckets,
  STORAGE_BUCKET
} from './lib/supabase';

// Upload file to Supabase Storage
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  bucket = STORAGE_BUCKET
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, ""); // Remove leading slashes
  
  // Convert string to buffer if needed
  const buffer = typeof data === "string" 
    ? Buffer.from(data, 'base64')
    : data;

  const result = await uploadToSupabase(key, buffer as Buffer, contentType, bucket);
  
  if (!result) {
    throw new Error(`Storage upload failed for ${key}`);
  }

  // For private 'documents' bucket, generate signed URL (valid for 1 year)
  // For other buckets, use public URL
  let url = result.url;
  if (bucket === 'documents') {
    const signedUrl = await getSignedUrl(key, 365 * 24 * 60 * 60, bucket);
    if (signedUrl) {
      url = signedUrl;
    }
  }

  return { key, url };
}

// Get URL for file (public URL since bucket has public access)
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const url = getPublicUrl(key);
  return { key, url };
}

// Delete file from storage
export async function storageDelete(relKey: string): Promise<boolean> {
  const key = relKey.replace(/^\/+/, "");
  return await deleteFromSupabase(key);
}

// Re-export for convenience
export { initializeStorageBuckets, STORAGE_BUCKET };
