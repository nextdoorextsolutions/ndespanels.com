/**
 * TagBadge Component
 * Displays a topic tag with emoji, label, and color styling
 */

import { ActivityTag, TAG_CONFIG } from "@/types/activity";

interface TagBadgeProps {
  tag: ActivityTag;
  size?: "sm" | "md";
}

export function TagBadge({ tag, size = "sm" }: TagBadgeProps) {
  const config = TAG_CONFIG[tag];
  
  if (!config) {
    return null; // Gracefully handle invalid tags
  }
  
  const sizeClasses = size === "sm" 
    ? "text-xs px-2 py-0.5" 
    : "text-sm px-3 py-1";
  
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full border ${config.color} ${sizeClasses} font-medium`}
      title={config.description}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
