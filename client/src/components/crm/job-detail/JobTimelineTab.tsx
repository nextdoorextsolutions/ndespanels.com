import { Card, CardContent } from "@/components/ui/card";
import { Clock, History } from "lucide-react";

interface Activity {
  id: number;
  description: string;
  activityType: string;
  createdAt: Date | string;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

interface JobTimelineTabProps {
  activities: Activity[];
  activityIcons: Record<string, any>;
}

export function JobTimelineTab({ activities, activityIcons }: JobTimelineTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Activity Timeline ({activities.length})</h2>
      </div>

      {activities.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700" />
          
          <div className="space-y-6">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.activityType] || Clock;
              return (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center z-10">
                    <Icon className="w-4 h-4 text-[#00d4aa]" />
                  </div>
                  
                  {/* Content */}
                  <Card className="flex-1 bg-slate-800 border-slate-700">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {activity.user && (
                              <span className="text-sm text-slate-400">
                                by {activity.user.name || activity.user.email}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 capitalize">
                          {activity.activityType.replace("_", " ")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
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
