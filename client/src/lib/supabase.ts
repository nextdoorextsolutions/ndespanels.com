import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// Client-side Supabase client with anon key (limited access)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Real-time subscription types
export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

// Subscribe to real-time changes on a table
export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  event: RealtimeEvent = "*"
): RealtimeChannel {
  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      "postgres_changes" as any,
      {
        event,
        schema: "public",
        table,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

// Subscribe to storage changes (file uploads/deletes)
export function subscribeToStorage(
  bucket: string,
  callback: (payload: any) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`storage-${bucket}`)
    .on("broadcast", { event: "file-change" }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return channel;
}

// Broadcast a storage change event
export async function broadcastStorageChange(
  bucket: string,
  action: "upload" | "delete",
  filePath: string,
  metadata?: any
) {
  const channel = supabase.channel(`storage-${bucket}`);
  
  await channel.send({
    type: "broadcast",
    event: "file-change",
    payload: {
      action,
      bucket,
      filePath,
      metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

// Unsubscribe from a channel
export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

// Subscribe to job updates for real-time CRM
export function subscribeToJobUpdates(
  jobId: number,
  callback: (payload: any) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`job-${jobId}`)
    .on("broadcast", { event: "job-update" }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return channel;
}

// Broadcast a job update
export async function broadcastJobUpdate(
  jobId: number,
  updateType: "status" | "note" | "document" | "photo" | "assignment",
  data: any
) {
  const channel = supabase.channel(`job-${jobId}`);
  
  await channel.send({
    type: "broadcast",
    event: "job-update",
    payload: {
      jobId,
      updateType,
      data,
      timestamp: new Date().toISOString(),
    },
  });
}
