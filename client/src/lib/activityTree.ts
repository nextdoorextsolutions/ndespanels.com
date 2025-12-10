/**
 * Activity Tree Builder
 * Converts flat list of activities into threaded structure
 */

import { Activity, ThreadedActivity } from "@/types/activity";

/**
 * Builds a tree structure from flat activity list
 * Activities with parentId become replies nested under their parent
 * 
 * @param flatActivities - Flat array of activities from the database
 * @returns Array of root activities with nested replies
 */
export function buildActivityTree(flatActivities: Activity[]): ThreadedActivity[] {
  const activityMap = new Map<number, ThreadedActivity>();
  const rootActivities: ThreadedActivity[] = [];

  // First pass: Create map of all activities with empty replies array
  for (const activity of flatActivities) {
    activityMap.set(activity.id, {
      ...activity,
      replies: [],
    });
  }

  // Second pass: Build tree structure
  for (const activity of flatActivities) {
    const threadedActivity = activityMap.get(activity.id)!;
    
    if (activity.parentId) {
      // This is a reply - add to parent's replies array
      const parent = activityMap.get(activity.parentId);
      if (parent) {
        parent.replies.push(threadedActivity);
      } else {
        // Parent not found (orphaned reply) - treat as root
        rootActivities.push(threadedActivity);
      }
    } else {
      // This is a root activity
      rootActivities.push(threadedActivity);
    }
  }

  // Sort replies by creation time (oldest first for conversation flow)
  Array.from(activityMap.values()).forEach((activity) => {
    activity.replies.sort((a: ThreadedActivity, b: ThreadedActivity) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });

  // Root activities stay in reverse chronological order (newest first)
  // They're already sorted from the database query
  return rootActivities;
}
