import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, Target, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

// Map insight types to icons and colors
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

export default function AIInsightsBanner() {
  const utils = trpc.useUtils();
  const { data: permissions } = trpc.users.getMyPermissions.useQuery();
  
  // Security: Only show to admin and owner
  const isAdminOrOwner = permissions?.role === 'admin' || permissions?.role === 'owner';
  
  const { data: summary, isLoading, refetch } = trpc.crm.getExecutiveSummary.useQuery(
    { force: false }, 
    {
      staleTime: 60 * 60 * 1000, // Cache for 60 minutes to match backend
      enabled: isAdminOrOwner, // Only fetch if user has permission
    }
  );

  const handleRefresh = async () => {
    // Force refresh bypasses server-side cache
    await utils.crm.getExecutiveSummary.invalidate();
    await refetch({ force: true } as any);
  };

  const insights = summary?.insights || [];
  const lastUpdated = summary?.generatedAt ? formatDistanceToNow(new Date(summary.generatedAt), { addSuffix: true }) : null;

  // Hide banner for non-admin/owner users
  if (!isAdminOrOwner) {
    return null;
  }

  return (
    <Card className="glass-card glow-border bg-slate-800/60 border-slate-700/50 p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00d4aa]/5 via-transparent to-cyan-500/5" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#00d4aa]" />
              <h2 className="text-2xl font-bold text-white">AI-Powered Insights</h2>
              <span className="ml-2 px-3 py-1 text-xs font-semibold bg-[#00d4aa]/20 text-[#00d4aa] rounded-full border border-[#00d4aa]/30">
                LIVE
              </span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Last updated {lastUpdated}</span>
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
            Refresh Analysis
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-[#00d4aa] animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-400">Analyzing your CRM data...</p>
            </div>
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight: any, index: number) => {
              const { icon: Icon, color, bgColor } = getInsightStyle(insight.type);
              return (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-slate-700/20 backdrop-blur-sm border border-slate-700/30 hover:border-[#00d4aa]/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg group-hover:scale-110 transition-transform", bgColor)}>
                      <Icon className={cn("w-5 h-5", color)} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{insight.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-slate-400">No insights available</p>
          </div>
        )}
      </div>
    </Card>
  );
}
