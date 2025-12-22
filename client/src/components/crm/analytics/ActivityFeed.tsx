import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, UserPlus, FileText, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

// Map activity types to icons and colors
const getActivityIcon = (type: string) => {
  switch (type) {
    case "status_change":
      return { icon: CheckCircle2, color: "text-emerald-400" };
    case "note_added":
      return { icon: FileText, color: "text-cyan-400" };
    case "appointment_scheduled":
      return { icon: Clock, color: "text-yellow-400" };
    case "lead_created":
      return { icon: UserPlus, color: "text-[#00d4aa]" };
    case "payment_received":
      return { icon: DollarSign, color: "text-emerald-400" };
    default:
      return { icon: AlertCircle, color: "text-slate-400" };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
};

export default function ActivityFeed() {
  const { data: activities, isLoading } = trpc.activities.getRecentActivities.useQuery({ limit: 10 });

  return (
    <Card className="glass-card glow-border bg-slate-800/60 border-slate-700/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#00d4aa]" />
          <CardTitle className="text-xl font-semibold text-white">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-400">Loading activities...</div>
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const { icon: Icon, color } = getActivityIcon(activity.type);
              const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });
              const amount = activity.job?.amountPaid && activity.job.amountPaid > 0 
                ? formatCurrency(activity.job.amountPaid) 
                : null;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <div className={cn("p-2 rounded-lg bg-slate-700/30", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      {activity.description || `${activity.type.replace('_', ' ')} - ${activity.job?.name || 'Unknown'}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-400">{timeAgo}</p>
                      {amount && (
                        <>
                          <span className="text-slate-500">•</span>
                          <span className="text-xs font-semibold text-[#00d4aa]">{amount}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-slate-400">No recent activities</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
