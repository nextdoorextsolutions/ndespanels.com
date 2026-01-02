import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Clock, TrendingUp, AlertCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

interface JobAISummaryProps {
  jobId: number;
}

const getInsightStyle = (type: string) => {
  switch (type) {
    case "success":
      return { icon: TrendingUp, color: "text-emerald-400", bgColor: "bg-emerald-400/10" };
    case "warning":
      return { icon: AlertCircle, color: "text-yellow-400", bgColor: "bg-yellow-400/10" };
    case "info":
      return { icon: Target, color: "text-[#00d4aa]", bgColor: "bg-[#00d4aa]/10" };
    default:
      return { icon: Sparkles, color: "text-cyan-400", bgColor: "bg-cyan-400/10" };
  }
};

export function JobAISummary({ jobId }: JobAISummaryProps) {
  const utils = trpc.useUtils();
  
  const { data: summary, isLoading, refetch } = trpc.crm.getJobSummary.useQuery(
    { jobId }, 
    {
      staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    }
  );

  const handleRefresh = async () => {
    await utils.crm.getJobSummary.invalidate();
    await refetch();
  };

  const insights = summary?.insights || [];
  const lastUpdated = summary?.generatedAt ? formatDistanceToNow(new Date(summary.generatedAt), { addSuffix: true }) : null;

  return (
    <Card className="glass-card glow-border bg-slate-800/60 border-slate-700/50 p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00d4aa]/5 via-transparent to-cyan-500/5" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00d4aa]" />
              <h3 className="text-lg font-bold text-white">AI Job Summary</h3>
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-[#00d4aa]/20 text-[#00d4aa] rounded-full border border-[#00d4aa]/30">
                LIVE
              </span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                <span>Updated {lastUpdated}</span>
              </div>
            )}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="border-[#00d4aa]/30 text-[#00d4aa] hover:bg-[#00d4aa]/10 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Sparkles className="w-6 h-6 text-[#00d4aa] animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-400">Analyzing job data...</p>
            </div>
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight: any, index: number) => {
              const { icon: Icon, color, bgColor } = getInsightStyle(insight.type);
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-slate-700/20 backdrop-blur-sm border border-slate-700/30 hover:border-[#00d4aa]/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg group-hover:scale-110 transition-transform", bgColor)}>
                      <Icon className={cn("w-4 h-4", color)} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-slate-400">No insights available for this job</p>
          </div>
        )}
      </div>
    </Card>
  );
}
