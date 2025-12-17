/**
 * DashboardCharts Component
 * Lead trends and conversion funnel with dark theme
 */

import { TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadTrendsChart } from "@/components/crm/LeadTrendsChart";

interface DashboardChartsProps {
  monthlyTrends: any[];
  stats: any;
}

function ConversionFunnel({ stats }: { stats: any }) {
  if (!stats) return null;

  const stages = [
    { label: "Leads", count: stats.leadCount || 0, color: "bg-orange-500" },
    { label: "Prospects", count: stats.prospectCount || 0, color: "bg-blue-500" },
    { label: "Approved", count: stats.approvedCount || 0, color: "bg-purple-500" },
    { label: "Completed", count: stats.completedCount || 0, color: "bg-teal-500" },
    { label: "Closed", count: stats.closedDealCount || 0, color: "bg-green-500" },
  ];

  const maxCount = Math.max(...stages.map((s: any) => s.count), 1);

  return (
    <div className="space-y-5">
      {stages.map((stage) => (
        <div key={stage.label} className="flex items-center gap-4 group">
          <div className="w-20 text-xs font-semibold text-gray-400 group-hover:text-white transition-colors uppercase tracking-wide">
            {stage.label}
          </div>
          <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${stage.color} opacity-80 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
              style={{ width: `${(stage.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="w-10 text-right text-sm font-bold text-white">{stage.count}</div>
        </div>
      ))}
    </div>
  );
}

export function DashboardCharts({ monthlyTrends, stats }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Lead Trends */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_25px_rgba(0,212,170,0.15)] transition-all">
        <CardHeader className="pb-2 border-b border-gray-800/50">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00d4aa]" />
            Lead Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <LeadTrendsChart data={monthlyTrends || []} />
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all">
        <CardHeader className="pb-2 border-b border-gray-800/50">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ConversionFunnel stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}
