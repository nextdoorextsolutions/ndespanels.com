import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MentionInput } from "@/components/MentionInput";
import { Send, MessageSquare } from "lucide-react";
import { TagSelector } from "./TagSelector";
import { ActivityTag } from "@/types/activity";

interface Message {
  id: number;
  description: string;
  activityType: string;
  createdAt: Date | string;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

interface JobMessagesTabProps {
  messages: Message[];
  canEdit: boolean;
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  formatMentions: (text: string) => React.ReactNode;
  selectedTags: ActivityTag[];
  onTagsChange: (tags: ActivityTag[]) => void;
}

export function JobMessagesTab({
  messages,
  canEdit,
  newMessage,
  onMessageChange,
  onSendMessage,
  isSending,
  formatMentions,
  selectedTags,
  onTagsChange,
}: JobMessagesTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Notes & Messages ({messages.length})</h2>
      </div>

      {/* New Message Input */}
      {canEdit && (
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-4">
            {/* Tag Selector */}
            <div className="mb-3">
              <TagSelector 
                selectedTags={selectedTags}
                onChange={onTagsChange}
              />
            </div>
            
            {/* Message Input */}
            <div className="flex gap-3">
              <MentionInput
                placeholder="Add a note or message... (Type @ to mention someone)"
                value={newMessage}
                onChange={onMessageChange}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 flex-1"
                minHeight="80px"
              />
              <Button 
                onClick={onSendMessage}
                disabled={!newMessage.trim() || isSending}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black self-end"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages List */}
      {messages.length > 0 ? (
        <div className="space-y-4">
          {messages.map((msg) => {
            const isCustomerMessage = msg.activityType === "customer_message";
            const isCallbackRequest = msg.activityType === "callback_requested";
            const isFromCustomer = isCustomerMessage || isCallbackRequest;
            
            return (
              <Card 
                key={msg.id} 
                className={`border ${isFromCustomer ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isFromCustomer 
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                        : 'bg-gradient-to-br from-[#00d4aa] to-[#00b894]'
                    }`}>
                      <span className={`font-semibold text-sm ${isFromCustomer ? 'text-white' : 'text-black'}`}>
                        {isFromCustomer ? 'C' : (msg.user?.name?.charAt(0) || msg.user?.email?.charAt(0) || "?")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-white">
                          {isFromCustomer ? 'Customer' : (msg.user?.name || msg.user?.email || "System")}
                        </p>
                        {isFromCustomer && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isCallbackRequest 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {isCallbackRequest ? '📞 Callback Requested' : '💬 Customer Message'}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap">{formatMentions(msg.description)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">No messages yet</p>
            {canEdit && (
              <p className="text-sm text-slate-500 mt-1">Start the conversation by adding a note above</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
