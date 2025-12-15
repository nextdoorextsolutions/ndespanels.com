import React, { useRef, useEffect, useState } from 'react';
import { Hash, Users, Pin, Search, Sparkles, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { usePresence, PresenceUser } from '@/hooks/usePresence';

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

interface ChatAreaProps {
  channelName: string;
  messages: ChatMessage[];
  inputText: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  currentUserId: string;
  geminiId: string;
  geminiName: string;
  onToggleAI: () => void;
  isAIOpen: boolean;
}

export function ChatArea({
  channelName,
  messages,
  inputText,
  onInputChange,
  onSendMessage,
  onKeyDown,
  isTyping,
  currentUserId,
  geminiId,
  geminiName,
  onToggleAI,
  isAIOpen,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Magic Bar state
  const [isMagicWorking, setMagicWorking] = useState(false);
  const draftMutation = trpc.globalChat.generateDraft.useMutation();

  // Presence tracking with custom auth
  const currentUser: PresenceUser = {
    id: currentUserId,
    name: 'Current User', // TODO: Get from auth context
    avatarUrl: undefined,
    role: 'user',
  };

  const { onlineUsers, typingUsers, broadcastTyping } = usePresence({
    threadId: channelName,
    user: currentUser,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMagicAction = async (action: 'grammar' | 'professional') => {
    if (!inputText.trim()) return;
    
    setMagicWorking(true);
    toast.loading('Polishing your message...', { id: 'magic-draft' });
    
    try {
      const result = await draftMutation.mutateAsync({ 
        type: action,
        text: inputText,
      });
      
      onInputChange(result.draft);
      toast.success('Message polished!', { id: 'magic-draft' });
    } catch (e) {
      console.error('Magic action error:', e);
      toast.error("Couldn't polish the text", { id: 'magic-draft' });
    } finally {
      setMagicWorking(false);
    }
  };

  const MessageAvatar = ({ name, avatarUrl, isSystem = false }: { name: string; avatarUrl?: string; isSystem?: boolean }) => {
    if (isSystem) {
      return (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-[#00d4aa] to-[#00b894] shadow-md">
            <Sparkles className="w-4 h-4 text-slate-900" />
          </AvatarFallback>
        </Avatar>
      );
    }

    return (
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500 text-white shadow-sm text-xs font-semibold">
          {name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">{channelName}</h2>
          
          {/* Facepile of online users */}
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((user) => (
                  <div key={user.id} className="relative" title={user.name}>
                    <Avatar className="w-6 h-6 border-2 border-slate-900">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-slate-700 text-xs text-white">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-slate-900 rounded-full"></div>
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-400">
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-500 ml-1">
                {onlineUsers.length} online
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pin className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="w-4 h-4 text-slate-400" />
          </Button>
          <Button
            variant={isAIOpen ? "default" : "ghost"}
            size="icon"
            className={`h-8 w-8 ${isAIOpen ? 'bg-[#00d4aa] text-slate-900 hover:bg-[#00b894]' : ''}`}
            onClick={onToggleAI}
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.userId.toString() === currentUserId;
          const isSystem = msg.userName === geminiName;

          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && <MessageAvatar name={msg.userName || 'Unknown'} avatarUrl={msg.userImage || undefined} isSystem={isSystem} />}

              <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-400">{msg.userName || 'Unknown'}</span>
                  <span className="text-[10px] text-slate-600">
                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.isEdited && (
                    <span className="text-[10px] text-slate-600 italic">(edited)</span>
                  )}
                </div>

                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    isMe
                      ? 'bg-[#00d4aa] text-slate-900 rounded-tr-none'
                      : isSystem
                      ? 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-[#00d4aa] animate-pulse"></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3">
            <MessageAvatar name={geminiName} avatarUrl={undefined} isSystem />
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-slate-400 mb-1">{geminiName}</span>
              <div className="bg-slate-800/80 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            {typingUsers.length === 1 ? (
              <>
                {typingUsers[0].name === geminiName ? (
                  // AI typing animation
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-[#00d4aa] animate-pulse" />
                    <span className="italic text-[#00d4aa]">{geminiName} is thinking...</span>
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-[#00d4aa] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1 h-1 bg-[#00d4aa] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1 h-1 bg-[#00d4aa] rounded-full animate-bounce"></span>
                    </div>
                  </div>
                ) : (
                  <span className="italic">{typingUsers[0].name} is typing...</span>
                )}
              </>
            ) : typingUsers.length === 2 ? (
              <span className="italic">{typingUsers[0].name} and {typingUsers[1].name} are typing...</span>
            ) : (
              <span className="italic">{typingUsers.length} people are typing...</span>
            )}
          </div>
        )}
        
        <div className="relative">
          {/* Magic Bar - Only visible when text exists */}
          {inputText.length > 5 && (
            <div className="absolute -top-10 left-0 flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button 
                onClick={() => handleMagicAction('grammar')}
                disabled={isMagicWorking}
                className="text-xs bg-slate-800/90 hover:bg-[#00d4aa]/20 text-slate-300 hover:text-[#00d4aa] px-3 py-1.5 rounded-full backdrop-blur-md transition-all flex items-center gap-1.5 border border-slate-700 hover:border-[#00d4aa]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Sparkles className="w-3 h-3" /> Fix Grammar
              </button>
              
              <button 
                onClick={() => handleMagicAction('professional')}
                disabled={isMagicWorking}
                className="text-xs bg-slate-800/90 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 px-3 py-1.5 rounded-full backdrop-blur-md transition-all flex items-center gap-1.5 border border-slate-700 hover:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Briefcase className="w-3 h-3" /> Professional
              </button>
            </div>
          )}

          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              onInputChange(e.target.value);
              // Broadcast typing event
              if (e.target.value.length > 0) {
                broadcastTyping();
              }
            }}
            onKeyDown={onKeyDown}
            disabled={isMagicWorking}
            placeholder={`Message #${channelName}... (Type @gemini to ask AI)`}
            className={`w-full bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl pl-4 pr-12 py-3 min-h-[56px] max-h-32 focus:ring-2 focus:ring-[#00d4aa] focus:border-[#00d4aa] resize-none text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent transition-opacity ${
              isMagicWorking ? 'animate-pulse opacity-50' : ''
            }`}
            rows={1}
          />

          <Button
            size="icon"
            className={`absolute right-2 bottom-2 h-9 w-9 transition-all ${
              inputText.trim()
                ? 'bg-[#00d4aa] text-slate-900 hover:bg-[#00b894]'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
            onClick={onSendMessage}
            disabled={!inputText.trim()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </div>

        <div className="text-[10px] text-slate-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line • Type @gemini to ask Zerox AI
        </div>
      </div>
    </div>
  );
}
