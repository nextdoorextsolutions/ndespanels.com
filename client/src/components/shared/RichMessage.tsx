/**
 * RichMessage Component
 * Renders interactive elements based on AI tool results
 */

import { useLocation } from "wouter";
import { Phone, Mail, FileText, MessageSquare, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, JobLookupData, JobSummaryData } from "@/types/chat";

interface RichMessageProps {
  data: ChatMessage["data"];
  intent: ChatMessage["intent"];
}

// Status badge colors
const statusColors: Record<string, string> = {
  lead: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  appointment_set: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  prospect: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  project_scheduled: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  closed_deal: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  closed_lost: "bg-red-500/20 text-red-300 border-red-500/30",
};

// Activity type icons
const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  note: <FileText className="w-3 h-3" />,
  sms: <MessageSquare className="w-3 h-3" />,
  appointment: <Calendar className="w-3 h-3" />,
  status_change: <CheckCircle className="w-3 h-3" />,
};

export function RichMessage({ data, intent }: RichMessageProps) {
  const [, setLocation] = useLocation();

  if (!data || !intent) return null;

  // Render Job Lookup Cards
  if (intent.tool === "lookup_job" && data && "jobs" in data) {
    const jobData = data as JobLookupData;
    
    if (!jobData.jobs || jobData.jobs.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 space-y-2">
        {jobData.jobs.slice(0, 5).map((job) => (
          <button
            key={job.id}
            onClick={() => setLocation(`/crm/job/${job.id}`)}
            className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-[#00d4aa]">
                    {job.fullName}
                  </h4>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border font-medium",
                      statusColors[job.status] || "bg-slate-600/20 text-slate-300 border-slate-600/30"
                    )}
                  >
                    {job.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {job.address}, {job.cityStateZip}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  {job.dealType && (
                    <span className="capitalize">{job.dealType}</span>
                  )}
                  {job.totalPrice && (
                    <span className="font-medium text-[#00d4aa]">
                      ${parseFloat(job.totalPrice).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
        {jobData.jobs.length > 5 && (
          <p className="text-xs text-slate-500 text-center pt-1">
            + {jobData.jobs.length - 5} more jobs
          </p>
        )}
      </div>
    );
  }

  // Render Job Summary Timeline
  if (intent.tool === "get_job_summary" && data && "job" in data && "activities" in data) {
    const summaryData = data as JobSummaryData;
    
    if (!summaryData.activities || summaryData.activities.length === 0) {
      return null;
    }

    return (
      <div className="mt-3">
        {/* Job Header */}
        <div className="mb-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">
                {summaryData.job.fullName}
              </h4>
              <p className="text-xs text-slate-400 truncate">
                {summaryData.job.address}
              </p>
            </div>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap",
                statusColors[summaryData.job.status] || "bg-slate-600/20 text-slate-300 border-slate-600/30"
              )}
            >
              {summaryData.job.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Mini Timeline */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 mb-2">Recent Activity</p>
          {summaryData.activities.slice(0, 3).map((activity, index) => {
            const icon = activityIcons[activity.activityType] || activityIcons.note;
            const date = new Date(activity.createdAt);
            const timeAgo = getTimeAgo(date);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-2 p-2 rounded bg-slate-800/50"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300 capitalize">
                      {activity.activityType.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {timeAgo}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {summaryData.activities.length > 3 && (
            <p className="text-xs text-slate-500 text-center pt-1">
              + {summaryData.activities.length - 3} more activities
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Helper function to get relative time
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
