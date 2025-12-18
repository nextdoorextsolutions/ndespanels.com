import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel, REALTIME_LISTEN_TYPES } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// User object for custom auth (no Supabase auth dependency)
export interface PresenceUser {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface UserPresence extends PresenceUser {
  online_at: string;
}

export interface TypingUser {
  id: string;
  name: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface UsePresenceOptions {
  threadId?: string;
  user: PresenceUser; // Custom user object
  enabled?: boolean; // Allow disabling the hook
}

export function usePresence({ threadId = 'global', user, enabled = true }: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus('disconnected');
      return;
    }
    
    if (!supabase) {
      // Only log warning once to prevent console spam
      if (typeof window !== 'undefined' && !(window as any).__presenceConfigWarningLogged) {
        console.warn('[usePresence] Presence disabled: Supabase client not available');
        (window as any).__presenceConfigWarningLogged = true;
      }
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    // Create channel for this thread
    const channelName = `presence:${threadId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence state changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: UserPresence[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const presence = presences[0] as any;
            // Only add if it has the expected structure (custom user object)
            if (presence.id && presence.name) {
              users.push({
                id: presence.id,
                name: presence.name,
                avatarUrl: presence.avatarUrl,
                role: presence.role,
                online_at: presence.online_at,
              });
            }
          }
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key);
      })
      // Listen for typing broadcasts
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { id: typingUserId, name: typingUserName } = payload;

        if (typingUserId === user.id) return; // Ignore own typing

        // Add to typing users
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.id === typingUserId);
          if (!exists) {
            return [...prev, { id: typingUserId, name: typingUserName }];
          }
          return prev;
        });

        // Clear existing timeout for this user
        if (typingTimeoutRef.current[typingUserId]) {
          clearTimeout(typingTimeoutRef.current[typingUserId]);
        }

        // Remove typing indicator after 3 seconds
        typingTimeoutRef.current[typingUserId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== typingUserId));
          delete typingTimeoutRef.current[typingUserId];
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          console.log('Presence tracking for:', user.name, {
            id: user.id,
            role: user.role,
            threadId,
          });
          // Track our presence with custom user object
          await channel.track({
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            online_at: new Date().toISOString(),
          });
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        channelRef.current.unsubscribe();
      }

      // Clear all typing timeouts
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};
      
      // Clear typing debounce
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      
      setConnectionStatus('disconnected');
    };
  }, [threadId, user.id, user.name, user.avatarUrl, user.role, enabled]);

  // Function to broadcast typing event (debounced to prevent flooding)
  const broadcastTyping = useCallback(() => {
    if (!channelRef.current) return;

    // Clear existing debounce timeout
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Debounce: wait 500ms before broadcasting
    typingDebounceRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { id: user.id, name: user.name },
        });
      }
    }, 500);
  }, [user.id, user.name]);

  // Function to manually track presence with custom user data
  const trackPresence = useCallback(async (customUser?: PresenceUser) => {
    if (channelRef.current) {
      const userToTrack = customUser || user;
      console.log('Presence tracking for:', userToTrack.name, {
        id: userToTrack.id,
        role: userToTrack.role,
        threadId,
      });
      await channelRef.current.track({
        id: userToTrack.id,
        name: userToTrack.name,
        avatarUrl: userToTrack.avatarUrl,
        role: userToTrack.role,
        online_at: new Date().toISOString(),
      });
    }
  }, [user, threadId]);

  return {
    onlineUsers,
    typingUsers,
    connectionStatus,
    broadcastTyping,
    trackPresence,
    isConnected: connectionStatus === 'connected',
  };
}
