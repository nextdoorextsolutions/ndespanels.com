import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  minHeight?: string;
}

interface User {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  onKeyDown,
  disabled,
  minHeight = "80px",
}: MentionInputProps) {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: allUsers = [] } = trpc.crm.getAllUsers.useQuery();

  // Filter users based on search
  const filteredUsers = allUsers.filter((user: User) => {
    const searchLower = mentionSearch.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check if user is typing @mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      // Check if there's no space after @ (still typing the mention)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionSearch(textAfterAt);
        setShowMentionList(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowMentionList(false);
  };

  // Handle user selection from mention list
  const insertMention = (user: User) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const beforeAt = value.substring(0, lastAtSymbol);
      const mentionText = `@[${user.id}:${user.name || user.email}]`;
      const newValue = beforeAt + mentionText + " " + textAfterCursor;
      const newCursorPos = beforeAt.length + mentionText.length + 1;

      onChange(newValue);
      setShowMentionList(false);
      setMentionSearch("");

      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Handle keyboard navigation in mention list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionList && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionList(false);
        return;
      }
    }

    // Pass through to parent handler
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Close mention list when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowMentionList(false);
    };

    if (showMentionList) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showMentionList]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        style={{ minHeight }}
      />

      {/* Mention Autocomplete Dropdown */}
      {showMentionList && filteredUsers.length > 0 && (
        <Card className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-slate-800 border-slate-700 shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-slate-400 px-2 py-1 mb-1">
              Mention a team member
            </div>
            {filteredUsers.map((user: User, index: number) => (
              <button
                key={user.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertMention(user);
                }}
                className={`w-full text-left px-3 py-2 rounded hover:bg-slate-700 transition-colors ${
                  index === selectedIndex ? "bg-slate-700" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-sm text-black">
                      {(user.name || user.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name || user.email}
                    </p>
                    {user.role && (
                      <p className="text-xs text-slate-400 capitalize">
                        {user.role.replace("_", " ")}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Helper text */}
      {!showMentionList && (
        <p className="text-xs text-slate-500 mt-1">
          Type <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">@</kbd> to mention a team member
        </p>
      )}
    </div>
  );
}
