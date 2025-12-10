/**
 * ActivityItem Component
 * Renders a single activity with support for:
 * - Tag badges
 * - Reply button
 * - Nested threaded replies (recursive)
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ThreadedActivity } from "@/types/activity";
import { TagBadge } from "@/components/shared/TagBadge";
import { ReplyInput } from "./ReplyInput";

interface ActivityItemProps {
  activity: ThreadedActivity;
  activityIcons: Record<string, any>;
  onReply: (text: string, parentId: number) => void;
  isReply?: boolean; // True if this is a nested reply (for styling)
}

export function ActivityItem({ 
  activity, 
  activityIcons, 
  onReply,
  isReply = false 
}: ActivityItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  
  const Icon = activityIcons[activity.activityType] || Clock;
  const hasReplies = activity.replies && activity.replies.length > 0;

  const handleReplySubmit = (text: string, parentId: number) => {
    onReply(text, parentId);
    setIsReplying(false);
  };

  return (
    <div className={isReply ? "" : "relative"}>
      <div className="relative flex gap-4">
        {/* Timeline dot (only for root activities) */}
        {!isReply && (
          <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center z-10 flex-shrink-0">
            <Icon className="w-4 h-4 text-[#00d4aa]" />
          </div>
        )}
        
        {/* Content Card */}
        <Card className={`flex-1 ${
          isReply 
            ? "bg-slate-700/50 border-slate-600" 
            : "bg-slate-800 border-slate-700"
        }`}>
          <CardContent className="pt-4">
            {/* Tags */}
            {activity.tags && activity.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {activity.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            )}

            {/* Message */}
            <p className="text-white whitespace-pre-wrap">{activity.description}</p>
            
            {/* Meta info & Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-600">
              <div className="flex items-center gap-2 text-sm">
                {activity.user && (
                  <span className="text-slate-400 font-medium">
                    {activity.user.name || activity.user.email}
                  </span>
                )}
                <span className="text-slate-500">•</span>
                <span className="text-slate-500">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-600/50 rounded text-xs text-slate-300 capitalize">
                  {activity.activityType.replace(/_/g, " ")}
                </span>
                
                {/* Reply button (only for root activities) */}
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReplying(!isReplying)}
                    className={`h-8 px-3 ${
                      isReplying 
                        ? "text-[#00d4aa] bg-slate-700" 
                        : "text-slate-400 hover:text-[#00d4aa] hover:bg-slate-700"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                    Reply
                  </Button>
                )}
                
                {/* Collapse/Expand button (if has replies) */}
                {hasReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 px-3"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    <span className="font-medium">{activity.replies.length}</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reply input */}
      {isReplying && (
        <ReplyInput
          parentId={activity.id}
          onSubmit={handleReplySubmit}
          onCancel={() => setIsReplying(false)}
        />
      )}

      {/* Threaded replies (recursive) */}
      {hasReplies && isExpanded && (
        <div className="mt-4 ml-8 space-y-4 border-l-2 border-slate-600 pl-4">
          {activity.replies.map((reply) => (
            <ActivityItem
              key={reply.id}
              activity={reply}
              activityIcons={activityIcons}
              onReply={onReply}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
