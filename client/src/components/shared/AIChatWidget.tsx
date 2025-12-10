/**
 * AI Chat Widget
 * Floating chat widget with rich media support
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X, Send, Loader2, Sparkles, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { RichMessage } from "./RichMessage";
import type { ChatMessage } from "@/types/chat";

interface AIChatWidgetProps {
  jobContext?: number; // Optional job ID for context
  className?: string;
}

export function AIChatWidget({ jobContext, className }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // AI Assistant mutation
  const askAssistant = trpc.ai.askAssistant.useMutation({
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        intent: data.intent,
        data: data.dataFound ? data.toolData : null,
        dataFound: data.dataFound,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast.error(`AI Error: ${error.message}`);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || askAssistant.isPending) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Send to AI
    askAssistant.mutate({
      question: input,
      jobContext,
    });
    
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
            "bg-[#00d4aa] hover:bg-[#00b894] text-slate-900",
            "z-50 transition-transform hover:scale-110",
            className
          )}
        >
          <Bot className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 w-96 h-[600px]",
            "bg-slate-900 border border-slate-700 rounded-lg shadow-2xl",
            "flex flex-col z-50",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center">
                <Bot className="w-4 h-4 text-slate-900" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Assistant</h3>
                <p className="text-xs text-slate-400">Ask me anything</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>Start a conversation!</p>
                  <p className="text-xs mt-1">Ask about jobs, customers, or anything else.</p>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-slate-900" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.role === "user"
                        ? "bg-[#00d4aa] text-slate-900"
                        : "bg-slate-800 text-white"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Rich Media Content */}
                    {message.role === "assistant" && message.data && message.intent && (
                      <RichMessage data={message.data} intent={message.intent} />
                    )}
                    
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Loading indicator */}
              {askAssistant.isPending && (
                <div className="flex gap-2 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-slate-900" />
                  </div>
                  <div className="bg-slate-800 text-white rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything..."
                className="min-h-[60px] max-h-[120px] resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                disabled={askAssistant.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || askAssistant.isPending}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-slate-900"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
