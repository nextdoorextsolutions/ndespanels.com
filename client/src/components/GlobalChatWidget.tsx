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

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  isAdmin?: boolean;
  isStreaming?: boolean;
}

interface User {
  id: string;
  name: string;
  email?: string;
}

const GEMINI_BOT_ID = 'gemini-bot';
const GEMINI_BOT_NAME = 'Zerox AI';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    content: "Welcome to the global operations chat! I'm Zerox AI, your CRM assistant. Ask me about jobs, customers, or anything else. 🚀",
    senderId: GEMINI_BOT_ID,
    senderName: GEMINI_BOT_NAME,
    createdAt: new Date(Date.now() - 86400000),
    isAdmin: true
  },
];

export const GlobalChatWidget: React.FC = () => {
  const { isOpen, isMinimized, setOpen, setMinimized } = useChatStore();
  const { user: authUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState('general');
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Build current user from auth
  const currentUser: PresenceUser = {
    id: authUser?.id?.toString() || 'guest',
    name: authUser?.name || authUser?.email || 'Guest User',
    avatarUrl: undefined, // TODO: Add avatar URL from user profile
    role: authUser?.role || 'user',
  };

  const { connectionStatus, isConnected } = usePresence({
    threadId: 'global',
    user: currentUser,
    enabled: isOpen && !isMinimized && !!authUser, // Only track when chat is open and user is authenticated
  });

  // tRPC mutations and subscriptions - must be called at component level
  const sendMessageMutation = trpc.globalChat.sendMessage.useMutation();
  const generateDraftMutation = trpc.globalChat.generateDraft.useMutation();
  
  // Streaming subscription for real-time AI responses
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingHistory, setStreamingHistory] = useState<Array<{ role: 'user' | 'model'; parts: string }>>([]);
  
  trpc.globalChat.streamMessage.useSubscription(
    {
      message: streamingMessage,
      history: streamingHistory,
      threadId: activeChannelId,
    },
    {
      enabled: !!streamingMessageId && streamingMessage.length > 0,
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
          setStreamingMessageId(null);
          setStreamingMessage('');
          setStreamingHistory([]);
          setIsTyping(false);
        }
      },
      onError(err) {
        console.error('Stream error:', err);
        toast.error('Streaming failed');
        setStreamingMessageId(null);
        setStreamingMessage('');
        setStreamingHistory([]);
        setIsTyping(false);
      },
    }
  );


  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputText,
      senderId: currentUser.id,
      senderName: currentUser.name,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputText;
    setInputText('');
    setIsTyping(true);

    // Check if message mentions Gemini or is in Gemini thread
    const shouldUseGemini = messageToSend.toLowerCase().includes('@gemini') || 
                           messageToSend.toLowerCase().includes('zerox');

    if (shouldUseGemini) {
      // Build chat history for context (before adding new messages)
      const history = messages
        .filter(m => m.senderId === currentUser.id || m.senderId === GEMINI_BOT_ID)
        .map(m => ({
          role: m.senderId === currentUser.id ? 'user' as const : 'model' as const,
          parts: m.content,
        }));

      // Create placeholder for streaming response
      const botMessageId = (Date.now() + 1).toString();
      const botMessage: ChatMessage = {
        id: botMessageId,
        content: '',
        senderId: GEMINI_BOT_ID,
        senderName: GEMINI_BOT_NAME,
        createdAt: new Date(),
        isAdmin: true,
        isStreaming: true, // Enable streaming indicator
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Trigger streaming subscription with saved message and history
      setStreamingMessage(messageToSend);
      setStreamingHistory(history);
      setStreamingMessageId(botMessageId);

      // The subscription will handle the streaming automatically
      // No need for try-catch here as subscription handles errors
    } else {
      // Regular team message (no AI)
      setIsTyping(false);
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
    const channelMap: Record<string, string> = {
      general: 'general',
      marketing: 'marketing',
      dev: 'dev',
      ux: 'ux',
    };
    return channelMap[activeChannelId] || activeChannelId.replace('dm-', '');
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-slate-900"></span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed right-4 z-50 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl
        ${isMinimized 
          ? 'bottom-0 w-72 h-14 rounded-b-none'
          : 'bottom-6 w-[90vw] h-[85vh] max-w-[1600px]'
        }
      `}
    >
      <div 
        className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-800 cursor-pointer select-none"
        onClick={() => !isMinimized && setMinimized(true)}
      >
        <div className="flex items-center gap-3">
          <div className="relative" title={`Connection: ${connectionStatus}`}>
            {isConnected ? (
              <Wifi className="w-4 h-4 text-[#00d4aa]" />
            ) : connectionStatus === 'connecting' ? (
              <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Global Operations Chat</h3>
            {!isMinimized && (
              <p className="text-xs text-slate-400">
                {isConnected ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
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
        <div 
          className={`grid h-[calc(100%-60px)] transition-all duration-300 ${
            isAIOpen 
              ? 'md:grid-cols-[260px_1fr_300px]' 
              : 'md:grid-cols-[260px_1fr]'
          }`}
        >
          {/* Left: Channel Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            <ChannelSidebar
              activeChannelId={activeChannelId}
              onChannelSelect={setActiveChannelId}
            />
          </div>

          {/* Middle: Chat Area - Full width on mobile */}
          <ChatArea
            channelName={getChannelName()}
            messages={messages}
            inputText={inputText}
            onInputChange={setInputText}
            onSendMessage={handleSendMessage}
            onKeyDown={handleKeyDown}
            isTyping={isTyping}
            currentUserId={currentUser.id}
            geminiId={GEMINI_BOT_ID}
            geminiName={GEMINI_BOT_NAME}
            onToggleAI={() => setIsAIOpen(!isAIOpen)}
            isAIOpen={isAIOpen}
          />

          {/* Right: AI Sidebar - Hidden on mobile */}
          {isAIOpen && (
            <div className="hidden md:block">
              <AISidebar
                onClose={() => setIsAIOpen(false)}
                onGenerateDraft={handleGenerateDraft}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
