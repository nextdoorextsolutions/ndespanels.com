/**
 * Job Detail Helpers
 * Utility functions and constants for JobDetail page
 */

import React from "react";
import { ArrowLeft, Search } from "lucide-react";

/**
 * Format mentions in messages
 * Converts @[userId:userName] format to styled mention components
 */
export const formatMentions = (text: string): React.ReactNode => {
  const mentionRegex = /@\[(\d+):([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-[#00d4aa] font-medium">
        @{match[2]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

/**
 * Activity Icons mapping
 * Maps activity types to their corresponding Lucide icons
 */
export const ACTIVITY_ICONS: Record<string, any> = {
  status_change: ArrowLeft,
  note: Search,
  // Add more as needed
};
