/**
 * ReplyInput Component
 * Inline reply input that appears below a message when user clicks "Reply"
 */

import { useState } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReplyInputProps {
  parentId: number;
  onCancel: () => void;
  onSubmit: (text: string, parentId: number) => void;
}

export function ReplyInput({ parentId, onSubmit, onCancel }: ReplyInputProps) {
  const [replyText, setReplyText] = useState("");

  const handleSubmit = () => {
    if (!replyText.trim()) return;
    onSubmit(replyText, parentId);
    setReplyText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="mt-3 ml-14 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
      <Textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Write a reply... (Ctrl+Enter to send, Esc to cancel)"
        className="bg-slate-800 border-slate-600 text-white min-h-[80px] mb-2 resize-none focus:ring-[#00d4aa] focus:border-[#00d4aa]"
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-slate-400 hover:text-white hover:bg-slate-600"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!replyText.trim()}
          className="bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 mr-1" />
          Send Reply
        </Button>
      </div>
    </div>
  );
}
