import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!enabled || !channelId) {
      return;
    }

    if (!supabase) {
      console.warn('[useChatRealtime] Supabase client not available');
      return;
    }

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
          console.log('New message received:', payload.new);
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
          console.log('Message updated:', payload.new);
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
          console.log('Message deleted:', payload.old);
          onMessageDelete(payload.old.id);
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for channel ${channelId}:`, status);
      });

    // Cleanup subscription on unmount or channel change
    return () => {
      if (channelRef.current && supabase) {
        console.log(`Unsubscribing from channel ${channelId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId, enabled, onNewMessage, onMessageUpdate, onMessageDelete]);

  return {
    isSubscribed: !!channelRef.current,
  };
}
