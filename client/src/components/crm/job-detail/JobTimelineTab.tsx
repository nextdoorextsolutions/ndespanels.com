import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThreadedActivity, ActivityTag, TAG_CONFIG } from "@/types/activity";
import { ActivityItem } from "./ActivityItem";

interface JobTimelineTabProps {
  activities: ThreadedActivity[];
  activityIcons: Record<string, any>;
  onReply: (text: string, parentId: number) => void;
  filterTag: ActivityTag | "all";
  onFilterChange: (tag: ActivityTag | "all") => void;
}

export function JobTimelineTab({ activities, activityIcons, onReply, filterTag, onFilterChange }: JobTimelineTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">System Timeline ({activities.length})</h2>
          <p className="text-sm text-slate-400">Status changes, file uploads, and system events</p>
        </div>
        
        {/* Filter Dropdown */}
        <Select value={filterTag} onValueChange={(v) => onFilterChange(v as ActivityTag | "all")}>
          <SelectTrigger className="w-56 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white hover:bg-slate-700">
              All Messages
            </SelectItem>
            {(Object.keys(TAG_CONFIG) as ActivityTag[]).map((tag) => {
              const config = TAG_CONFIG[tag];
              return (
                <SelectItem 
                  key={tag} 
                  value={tag} 
                  className="text-white hover:bg-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <span>{config.emoji}</span>
                    <span>{config.label}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {activities.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700" />
          
          <div className="space-y-6">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                activityIcons={activityIcons}
                onReply={onReply}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">No activity recorded yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
