import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JobPipelineTracker } from "@/components/JobPipelineTracker";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JobStatus } from "@/types";

const PIPELINE_ORDER: JobStatus[] = [
  "lead",
  "appointment_set",
  "prospect",
  "approved",
  "project_scheduled",
  "completed",
  "invoiced",
  "closed_deal",
];

const STATUS_LABELS: Record<JobStatus, string> = {
  lead: "Lead",
  appointment_set: "Appointment Set",
  prospect: "Prospect",
  approved: "Approved",
  project_scheduled: "Project Scheduled",
  completed: "Completed",
  invoiced: "Invoiced",
  lien_legal: "Lien Legal",
  closed_deal: "Closed Deal",
  closed_lost: "Closed Lost",
};

interface JobPipelineProps {
  currentStatus: JobStatus;
  canEdit: boolean;
  onStatusChange: (newStatus: JobStatus) => void;
}

export function JobPipeline({ currentStatus, canEdit, onStatusChange }: JobPipelineProps) {
  const currentIndex = PIPELINE_ORDER.indexOf(currentStatus);
  const canGoBack = currentIndex > 0 && PIPELINE_ORDER.includes(currentStatus);
  const canGoForward = currentIndex < PIPELINE_ORDER.length - 1 && currentIndex !== -1;

  const handlePrevious = () => {
    if (canGoBack) {
      const prevStatus = PIPELINE_ORDER[currentIndex - 1];
      onStatusChange(prevStatus);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      const nextStatus = PIPELINE_ORDER[currentIndex + 1];
      onStatusChange(nextStatus);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Pipeline Status</CardTitle>
          {canEdit && (
            <div className="flex items-center gap-3">
              <button
                className="
                  group relative px-5 py-2.5 rounded-full
                  bg-slate-800/80 backdrop-blur-sm
                  border-2 border-slate-600/50
                  text-slate-300 font-semibold text-sm
                  transition-all duration-300 ease-out
                  hover:scale-105 hover:bg-slate-700/80 hover:border-slate-500 hover:text-white
                  hover:shadow-[0_0_20px_rgba(100,116,139,0.3)]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                  disabled:hover:bg-slate-800/80 disabled:hover:border-slate-600/50
                  flex items-center gap-2
                "
                disabled={!canGoBack}
                onClick={handlePrevious}
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  className="
                    group relative px-6 py-2.5 rounded-full
                    bg-gradient-to-r from-[#00d4aa] to-[#00b894]
                    border-2 border-[#00d4aa]
                    text-white font-bold text-sm
                    transition-all duration-300 ease-out
                    hover:scale-110 hover:shadow-[0_0_30px_rgba(0,212,170,0.6)]
                    hover:from-[#00e6bc] hover:to-[#00d4aa]
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                    disabled:hover:shadow-none
                    flex items-center gap-2
                  "
                  disabled={!canGoForward}
                  onClick={handleNext}
                >
                  Next
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                
                {/* Quick Jump Dropdown */}
                <Select value={currentStatus} onValueChange={(value) => onStatusChange(value as JobStatus)}>
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                    <SelectValue placeholder="Jump to stage..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {PIPELINE_ORDER.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                      >
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                    <SelectItem 
                      value="lien_legal" 
                      className="text-white hover:bg-slate-700 focus:bg-slate-700"
                    >
                      {STATUS_LABELS["lien_legal"]}
                    </SelectItem>
                    <SelectItem 
                      value="closed_lost" 
                      className="text-white hover:bg-slate-700 focus:bg-slate-700"
                    >
                      {STATUS_LABELS["closed_lost"]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <JobPipelineTracker currentStatus={currentStatus} />
      </CardContent>
    </Card>
  );
}
