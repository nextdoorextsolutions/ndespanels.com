import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMessage {
  id: number;
  content: string;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  createdAt: Date;
  isEdited?: boolean;
  editedAt?: Date | null;
  metadata?: any;
}

interface UseChatRealtimeProps {
  channelId: number | null;
  onNewMessage: (message: any) => void;
  onMessageUpdate: (message: any) => void;
  onMessageDelete: (messageId: number) => void;
  enabled?: boolean;
}

/**
 * Custom hook for Supabase Realtime chat subscriptions
 * Automatically subscribes to chat_messages table changes for a specific channel
 */
export function useChatRealtime({
  channelId,
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  enabled = true,
}: UseChatRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  useEffect(() => {
    if (!enabled || !channelId) {
      setConnectionStatus('disconnected');
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      return;
    }

    if (!supabase) {
      // Only log warning once to prevent console spam
      if (typeof window !== 'undefined' && !(window as any).__chatRealtimeConfigWarningLogged) {
        console.warn('[useChatRealtime] Chat realtime disabled: Supabase client not available');
        (window as any).__chatRealtimeConfigWarningLogged = true;
      }
      setConnectionStatus('disconnected');
      return;
    }

    // Prevent infinite reconnection loops
    if (retryCountRef.current >= maxRetries) {
      if (typeof window !== 'undefined' && !(window as any).__chatRealtimeMaxRetriesLogged) {
        console.warn('[useChatRealtime] Max retries reached. Realtime disabled for this session.');
        (window as any).__chatRealtimeMaxRetriesLogged = true;
      }
      setConnectionStatus('disconnected');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s
    const backoffDelay = Math.pow(2, retryCountRef.current) * 1000;
    
    // If this is a retry, wait before reconnecting
    if (retryCountRef.current > 0) {
      retryTimeoutRef.current = setTimeout(() => {
        connectToRealtime();
      }, backoffDelay);
      return;
    }

    // First connection attempt - no delay
    connectToRealtime();

    function connectToRealtime() {
      if (!supabase) return;

      // Create a unique channel name for this chat channel
      const realtimeChannelName = `chat_channel_${channelId}`;

      // Subscribe to changes in chat_messages table for this channel
      channelRef.current = supabase
        .channel(realtimeChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          onNewMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          onMessageUpdate(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          onMessageDelete(payload.old.id);
        }
      )
        .subscribe((status) => {
          // Update connection status based on subscription state
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            retryCountRef.current = 0; // Reset retry count on success
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            retryCountRef.current += 1;
            setConnectionStatus('disconnected');
            
            // Force cleanup to prevent reconnection spam
            if (retryCountRef.current >= maxRetries && channelRef.current && supabase) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
          } else {
            setConnectionStatus('connecting');
          }
        });

      // Set initial connecting state
      setConnectionStatus('connecting');
    }

    // Cleanup subscription on unmount or channel change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setConnectionStatus('disconnected');
      }
    };
  }, [channelId, enabled, onNewMessage, onMessageUpdate, onMessageDelete]);

  return {
    isSubscribed: !!channelRef.current,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
  };
}
