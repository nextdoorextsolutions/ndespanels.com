import { useEffect, useRef, useCallback } from "react";
import { 
  supabase, 
  subscribeToJobUpdates, 
  broadcastJobUpdate, 
  unsubscribe 
} from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type JobUpdateType = "status" | "note" | "document" | "photo" | "assignment" | "message";

interface JobUpdatePayload {
  jobId: number;
  updateType: JobUpdateType;
  data: any;
  timestamp: string;
}

interface UseRealtimeJobOptions {
  jobId: number;
  onUpdate?: (payload: JobUpdatePayload) => void;
  enabled?: boolean;
}

export function useRealtimeJob({ jobId, onUpdate, enabled = true }: UseRealtimeJobOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !jobId) return;

    // Subscribe to job updates
    channelRef.current = subscribeToJobUpdates(jobId, (payload) => {
      if (onUpdate && payload.payload) {
        onUpdate(payload.payload as JobUpdatePayload);
      }
    });

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [jobId, enabled, onUpdate]);

  // Function to broadcast updates to other users
  const broadcast = useCallback(
    async (updateType: JobUpdateType, data: any) => {
      if (!jobId) return;
      await broadcastJobUpdate(jobId, updateType as any, data);
    },
    [jobId]
  );

  return { broadcast };
}

// Hook for subscribing to all CRM updates (for dashboard/leads list)
export function useRealtimeCRM(onUpdate?: (payload: any) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Subscribe to a general CRM channel for list updates
    channelRef.current = supabase
      .channel("crm-updates")
      .on("broadcast", { event: "crm-update" }, (payload) => {
        if (onUpdate && payload.payload) {
          onUpdate(payload.payload);
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [onUpdate]);

  // Broadcast CRM-wide updates
  const broadcastCRM = useCallback(async (updateType: string, data: any) => {
    const channel = supabase.channel("crm-updates");
    await channel.send({
      type: "broadcast",
      event: "crm-update",
      payload: {
        updateType,
        data,
        timestamp: new Date().toISOString(),
      },
    });
  }, []);

  return { broadcastCRM };
}
