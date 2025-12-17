/**
 * useJobTimeline Hook
 * Handles timeline filtering and threaded activity tree building
 */

import { useMemo } from "react";
import { buildActivityTree } from "@/lib/activityTree";
import type { ThreadedActivity, ActivityTag } from "@/types/activity";

interface UseJobTimelineProps {
  activities: any[];
  filterTag: ActivityTag | "all";
  searchQuery: string;
}

export function useJobTimeline({ activities, filterTag, searchQuery }: UseJobTimelineProps) {
  const threadedActivities = useMemo(() => {
    // Build threaded activity tree
    // Cast activities to match Activity type (tags from backend are string[] | null, we normalize to ActivityTag[] | undefined)
    return activities.length > 0 ? buildActivityTree(activities as any) : [];
  }, [activities]);

  const filteredTimeline = useMemo(() => {
    let filtered: ThreadedActivity[] = threadedActivities;

    // Filter by tag
    if (filterTag !== "all") {
      filtered = filtered.filter((activity: ThreadedActivity) => {
        // Check if activity or any of its replies have the tag
        const hasTag = activity.tags?.includes(filterTag);
        const replyHasTag = activity.replies?.some(reply => 
          reply.tags?.includes(filterTag)
        );
        return hasTag || replyHasTag;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((activity: ThreadedActivity) => {
        // Check if root activity matches
        const rootMatches = activity.description.toLowerCase().includes(searchLower);
        
        // Check if any reply matches (recursive search)
        const replyMatches = activity.replies?.some(reply => 
          reply.description.toLowerCase().includes(searchLower)
        );
        
        return rootMatches || replyMatches;
      });
    }

    return filtered;
  }, [threadedActivities, filterTag, searchQuery]);

  return {
    threadedActivities,
    filteredTimeline,
  };
}
