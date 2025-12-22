import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Maximize2, Minus, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/useChatStore';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ChannelSidebar } from './chat/ChannelSidebar';
import { ChatArea } from './chat/ChatArea';
import { AISidebar } from './chat/AISidebar';
import { usePresence, PresenceUser } from '@/hooks/usePresence';
import { useAuth } from '@/_core/hooks/useAuth';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useLocation } from 'wouter';

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
  isStreaming?: boolean;
}

const GEMINI_BOT_ID = 'gemini-bot';
const GEMINI_BOT_NAME = 'Zerox AI';

// Check OAuth config once at module level to prevent re-checking on every render
const OAUTH_PORTAL_URL = import.meta.env.VITE_OAUTH_PORTAL_URL;
const APP_ID = import.meta.env.VITE_APP_ID;
const IS_OAUTH_CONFIGURED = !!(OAUTH_PORTAL_URL && APP_ID);

// Auth pages where chat should be disabled (exact matches only)
const AUTH_PAGES = ['/login', '/forgot-password', '/reset-password', '/portal', '/upload'];

// Log warning once at module load if OAuth is not configured
if (!IS_OAUTH_CONFIGURED && typeof window !== 'undefined' && !(window as any).__chatConfigWarningLogged) {
  console.warn('[GlobalChatWidget] Chat disabled: Missing Auth Configuration',
    '\n  VITE_OAUTH_PORTAL_URL:', OAUTH_PORTAL_URL || 'Missing',
    '\n  VITE_APP_ID:', APP_ID || 'Missing'
  );
  (window as any).__chatConfigWarningLogged = true;
}

export const GlobalChatWidget: React.FC = React.memo(() => {
  const [location] = useLocation();
  
  // Check conditions but don't return early - hooks must be called first
  const currentPath = location.toLowerCase();
  const isOnAuthPage = AUTH_PAGES.some(page => currentPath === page || currentPath.startsWith(page + '/'));
  
  // 1. ALL HOOKS MUST BE CALLED FIRST - Before any conditional returns
  const { isOpen, isMinimized, setOpen, setMinimized } = useChatStore();
  const { user: authUser, isAuthenticated, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [activeChannelName, setActiveChannelName] = useState('general-announcements');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingHistory, setStreamingHistory] = useState<Array<{ role: 'user' | 'model'; parts: string }>>([]);
  const [messageOffset, setMessageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const isStreamingActiveRef = React.useRef(false);

  // Build effective user from auth or localStorage fallback (needed for hooks below)
  const storedUser = typeof window !== 'undefined' 
    ? (() => {
        try {
          const stored = localStorage.getItem('manus-runtime-user-info');
          return stored && stored !== 'undefined' ? JSON.parse(stored) : null;
        } catch (e) {
          console.warn('[GlobalChatWidget] Failed to parse stored user:', e);
          return null;
        }
      })()
    : null;
  const effectiveUser = authUser || storedUser;

  // Fetch channels
  const { data: channels } = trpc.messaging.getChannels.useQuery(undefined, {
    enabled: isAuthenticated && !!effectiveUser,
  });

  // Fetch messages for active channel with pagination
  const { data: channelMessages, refetch: refetchMessages } = trpc.messaging.getMessages.useQuery(
    { channelId: activeChannelId!, limit: 50, offset: messageOffset },
    { enabled: !!activeChannelId }
  );

  // Send message mutation
  const sendTeamMessageMutation = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      // We do NOT refetch immediately because we already showed the message.
      // The Realtime Subscription (supabase) will eventually confirm it.
      // This prevents the "Double Message" flicker.
    },
  });

  // Mark as read mutation
  const markAsReadMutation = trpc.messaging.markAsRead.useMutation();

  // Supabase Realtime subscription for auto-updates
  const { connectionStatus: realtimeConnectionStatus, isConnected: realtimeConnected } = useChatRealtime({
    channelId: activeChannelId,
    enabled: isOpen && !!activeChannelId,
    onNewMessage: (newMsg) => {
      // Optimistic updates handle current user messages, only add others
      if (newMsg.user_id !== effectiveUser?.id) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, {
            id: newMsg.id,
            content: newMsg.content,
            userId: newMsg.user_id,
            userName: newMsg.user_name,
            userEmail: newMsg.user_email,
            userImage: newMsg.user_image,
            createdAt: new Date(newMsg.created_at),
            isEdited: newMsg.is_edited || false,
            editedAt: newMsg.edited_at ? new Date(newMsg.edited_at) : null,
            metadata: newMsg.metadata,
          }];
        });
      }
    },
    onMessageUpdate: (updatedMsg) => {
      // Update existing message
      setMessages(prev => 
        prev.map(m => m.id === updatedMsg.id ? {
          ...m,
          content: updatedMsg.content,
          isEdited: updatedMsg.is_edited,
          editedAt: updatedMsg.edited_at ? new Date(updatedMsg.edited_at) : null,
        } : m)
      );
    },
    onMessageDelete: (messageId) => {
      // Remove deleted message
      setMessages(prev => prev.filter(m => m.id !== messageId));
    },
  });

  // Build current user for presence tracking
  const currentUser: PresenceUser = {
    id: effectiveUser?.id?.toString() || 'guest',
    name: effectiveUser?.name || effectiveUser?.email || 'Guest User',
    avatarUrl: undefined,
    role: effectiveUser?.role || 'user',
  };

  // Set initial channel when channels load
  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      const defaultChannel = channels.find(c => c.name === 'general-announcements') || channels[0];
      setActiveChannelId(defaultChannel.id);
      setActiveChannelName(defaultChannel.name);
    }
  }, [channels, activeChannelId]);

  // Update messages when channel messages load
  useEffect(() => {
    if (channelMessages) {
      const newMessages = channelMessages.map(m => ({
        id: m.id,
        content: m.content,
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
        userImage: m.userImage,
        createdAt: new Date(m.createdAt),
        isEdited: m.isEdited || false,
        editedAt: m.editedAt ? new Date(m.editedAt) : null,
        metadata: m.metadata,
      }));
      
      if (messageOffset === 0) {
        setMessages(newMessages);
      } else {
        // Append older messages for pagination
        setMessages(prev => [...newMessages, ...prev]);
      }
      
      // Check if there are more messages to load
      setHasMoreMessages(channelMessages.length === 50);
    }
  }, [channelMessages, messageOffset]);

  // Mark channel as read when opening
  useEffect(() => {
    if (activeChannelId && isOpen && !isMinimized) {
      markAsReadMutation.mutate({ channelId: activeChannelId });
    }
  }, [activeChannelId, isOpen, isMinimized]);

  // Cleanup typing indicator when streaming stops or component unmounts
  useEffect(() => {
    if (!streamingMessageId && isTyping) {
      setIsTyping(false);
    }
  }, [streamingMessageId, isTyping]);

  // usePresence hook - always called, but enabled flag controls behavior
  // Keep connection active even when minimized so notifications work
  const { connectionStatus, isConnected } = usePresence({
    threadId: 'global',
    user: currentUser,
    enabled: isOpen && !!authUser, // Removed !isMinimized to keep connection when minimized
  });

  // tRPC mutations and subscriptions - must be called at component level
  const generateDraftMutation = trpc.messaging.generateDraft.useMutation();
  
  trpc.messaging.streamAIMessage.useSubscription(
    {
      message: streamingMessage,
      history: streamingHistory,
      channelId: activeChannelId || undefined,
    },
    {
      enabled: !!streamingMessageId && streamingMessage.length > 0 && !isStreamingActiveRef.current,
      onStarted() {
        isStreamingActiveRef.current = true;
      },
      onData(chunk) {
        if (!chunk.done && streamingMessageId) {
          setMessages(prev => 
            prev.map(m => 
              m.id === streamingMessageId
                ? { ...m, content: m.content + chunk.chunk }
                : m
            )
          );
        } else if (chunk.done && streamingMessageId) {
          // Mark streaming complete
          setMessages(prev => 
            prev.map(m => 
              m.id === streamingMessageId
                ? { ...m, isStreaming: false }
                : m
            )
          );
          isStreamingActiveRef.current = false;
          setStreamingMessageId(null);
          setStreamingMessage('');
          setStreamingHistory([]);
          setIsTyping(false);
        }
      },
      onComplete() {
        // Ensure typing indicator is cleared when stream completes
        if (streamingMessageId) {
          setMessages(prev => 
            prev.map(m => 
              m.id === streamingMessageId
                ? { ...m, isStreaming: false }
                : m
            )
          );
        }
        isStreamingActiveRef.current = false;
        setStreamingMessageId(null);
        setStreamingMessage('');
        setStreamingHistory([]);
        setIsTyping(false);
      },
      onError(err) {
        console.error('[GlobalChatWidget] Stream error:', err);
        console.error('[GlobalChatWidget] Error details:', {
          message: err.message,
          code: err.data?.code,
          httpStatus: err.data?.httpStatus,
        });
        toast.error('Streaming failed');
        // Clear typing indicator and streaming state
        isStreamingActiveRef.current = false;
        setStreamingMessageId(null);
        setStreamingMessage('');
        setStreamingHistory([]);
        setIsTyping(false);
      },
    }
  );


  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChannelId) return;

    const messageToSend = inputText;
    setInputText(''); // Clear input immediately

    // 1. CREATE FAKE MESSAGE FOR INSTANT DISPLAY
    const tempId = Date.now(); // Temporary ID
    const optimisticMessage: ChatMessage = {
      id: tempId,
      content: messageToSend,
      userId: effectiveUser?.id || 0,
      userName: effectiveUser?.name || 'Me',
      userEmail: effectiveUser?.email || '',
      userImage: effectiveUser?.image || null,
      createdAt: new Date(),
      isStreaming: false,
    };

    // 2. FORCE UPDATE SCREEN INSTANTLY
    setMessages((prev) => [...prev, optimisticMessage]);

    // Check if message mentions Gemini or is in Gemini thread
    const shouldUseGemini = messageToSend.toLowerCase().includes('@gemini') || 
                           messageToSend.toLowerCase().includes('@zerox');

    if (shouldUseGemini) {
      setIsTyping(true);
      
      // Build chat history for context (limit to last 15 messages to save costs)
      const history = messages
        .filter(m => m.userId === effectiveUser?.id || m.userName === GEMINI_BOT_NAME)
        .slice(-15)
        .map(m => ({
          role: m.userId === effectiveUser?.id ? 'user' as const : 'model' as const,
          parts: m.content,
        }));

      // Create placeholder for streaming response
      const botMessageId = Date.now() + 1;
      const botMessage: ChatMessage = {
        id: botMessageId,
        content: '',
        userId: 0,
        userName: GEMINI_BOT_NAME,
        userEmail: null,
        userImage: null,
        createdAt: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Trigger streaming subscription
      setStreamingMessage(messageToSend);
      setStreamingHistory(history);
      setStreamingMessageId(botMessageId);

    } else {
      // 3. SEND TO SERVER IN BACKGROUND
      try {
        await sendTeamMessageMutation.mutateAsync({
          channelId: activeChannelId,
          content: messageToSend,
        });
        // Success! Realtime subscription will likely replace our fake message with the real one automatically.
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
        // Rollback: Remove the fake message if it failed
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputText(messageToSend); // Put text back in box so they can try again
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGenerateDraft = async (type: 'grammar' | 'professional' | 'summarize') => {
    if (!inputText.trim()) {
      toast.error('Please enter some text first');
      return;
    }

    try {
      const result = await generateDraftMutation.mutateAsync({
        type,
        text: inputText,
      });

      setInputText(result.draft);
      toast.success(`Draft ${type} generated!`);
    } catch (error) {
      console.error('Draft generation error:', error);
      toast.error('Failed to generate draft');
    }
  };

  const getChannelName = () => {
    return activeChannelName;
  };

  const handleChannelSelect = (channelIdentifier: string) => {
    // Support both channel name and channel ID
    // If it's a number, treat as ID, otherwise treat as name
    const isNumericId = /^\d+$/.test(channelIdentifier);
    
    const channel = channels?.find(c => 
      isNumericId 
        ? c.id === parseInt(channelIdentifier, 10)
        : c.name === channelIdentifier
    );
    
    if (channel) {
      setActiveChannelId(channel.id);
      setActiveChannelName(channel.name);
      setMessageOffset(0); // Reset pagination when switching channels
      setHasMoreMessages(true);
    }
  };

  const loadMoreMessages = () => {
    if (hasMoreMessages && !channelMessages) {
      setMessageOffset(prev => prev + 50);
    }
  };

  // Check OAuth config and auth page status (after all hooks are called)
  if (!IS_OAUTH_CONFIGURED) {
    return null;
  }
  
  if (isOnAuthPage) {
    return null;
  }
  
  // Only hide if loading AND no user data exists (initial load or stored)
  if (loading && !effectiveUser) {
    return null;
  }
  
  if (!isAuthenticated && !effectiveUser) {
    return null;
  }
  
  if (!effectiveUser) {
    return null;
  }
  
  if (!isOpen) {
    
    // Calculate total unread count across all channels
    const totalUnreadCount = channels?.reduce((sum, channel) => sum + (channel.unreadCount || 0), 0) || 0;
    
    return (
      <div className="fixed bottom-6 right-6 z-40 md:bottom-6 md:right-6">
        <button
          onClick={() => setOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-7 h-7" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-900 shadow-lg">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed z-40 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl
        ${isMinimized 
          ? 'bottom-0 right-0 left-0 md:left-auto md:right-4 w-full md:w-80 h-14 rounded-b-none md:rounded-b-2xl'
          : 'bottom-0 right-0 left-0 top-0 md:bottom-6 md:right-4 md:left-auto md:top-auto w-full md:w-[900px] h-full md:h-[650px] md:rounded-2xl rounded-none'
        }
      `}
    >
      <div 
        className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-800 cursor-pointer select-none"
        onClick={() => !isMinimized && setMinimized(true)}
      >
        <div className="flex items-center gap-3">
          <div className="relative" title={`Chat: ${realtimeConnectionStatus}`}>
            {realtimeConnected ? (
              <Wifi className="w-4 h-4 text-[#00d4aa]" />
            ) : realtimeConnectionStatus === 'connecting' ? (
              <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">NextDoor Operations</h3>
            {!isMinimized && (
              <p className="text-xs text-slate-400">
                {realtimeConnected ? 'Connected' : realtimeConnectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(!isMinimized);
            }}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              setMinimized(false);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="h-[calc(100%-60px)] flex">
          {/* Channel Sidebar */}
          <ChannelSidebar
            activeChannelId={activeChannelName}
            onChannelSelect={handleChannelSelect}
            channels={channels || []}
          />
          
          {/* Chat Area */}
          <div className="flex-1">
            <ChatArea
              channelName={getChannelName()}
              messages={messages}
              inputText={inputText}
              onInputChange={setInputText}
              onSendMessage={handleSendMessage}
              onKeyDown={handleKeyDown}
              isTyping={isTyping}
              currentUserId={effectiveUser?.id?.toString() || 'guest'}
              geminiId={GEMINI_BOT_ID}
              geminiName={GEMINI_BOT_NAME}
              onToggleAI={() => setIsAIOpen(!isAIOpen)}
              isAIOpen={isAIOpen}
            />
          </div>

          {/* AI Sidebar - conditionally shown */}
          {isAIOpen && (
            <AISidebar
              onGenerateDraft={handleGenerateDraft}
              isGenerating={generateDraftMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
});
