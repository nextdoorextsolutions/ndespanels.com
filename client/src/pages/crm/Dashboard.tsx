import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Users,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  Phone,
  ChevronRight,
  Plus,
  Eye,
  TrendingUp,
  DollarSign,
  BarChart3,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/crm/CRMLayout";

// Pipeline stage configuration with AccuLynx-style colors
const pipelineStages = [
  { key: "new_lead", label: "Lead", short: "L", color: "bg-orange-500" },
  { key: "contacted", label: "Contacted", short: "C", color: "bg-yellow-500" },
  { key: "appointment_set", label: "Scheduled", short: "S", color: "bg-blue-500" },
  { key: "inspection_complete", label: "Inspected", short: "I", color: "bg-purple-500" },
  { key: "report_sent", label: "Report Sent", short: "R", color: "bg-teal-500" },
  { key: "closed_won", label: "Closed", short: "W", color: "bg-green-500" },
];

// Category tabs configuration
const categoryTabs = [
  { key: "prospect", label: "Prospects", color: "bg-orange-500" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { key: "completed", label: "Completed", color: "bg-purple-500" },
  { key: "invoiced", label: "Invoiced", color: "bg-green-500" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
];

// Action items configuration
const actionItems = [
  { key: "unassigned", label: "Unassigned Leads", icon: Users, color: "text-orange-400" },
  { key: "follow_up", label: "Needs Follow-up", icon: Phone, color: "text-yellow-400" },
  { key: "pending_inspection", label: "Pending Inspection", icon: Calendar, color: "text-blue-400" },
  { key: "report_pending", label: "Reports Pending", icon: FileText, color: "text-purple-400" },
  { key: "watch_list", label: "Watch List", icon: Eye, color: "text-red-400" },
  { key: "overdue", label: "Overdue Tasks", icon: AlertCircle, color: "text-red-500" },
];

// Simple chart component using canvas
function LeadTrendChart({ data }: { data: { month: string; leads: number; closed: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Find max value for scaling
    const maxValue = Math.max(...data.map(d => Math.max(d.leads, d.closed)), 1);

    // Draw grid lines
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Draw bars
    const barWidth = chartWidth / data.length / 3;
    const gap = barWidth / 2;

    data.forEach((item, index) => {
      const x = padding + (chartWidth / data.length) * index + gap;
      
      // Leads bar (teal)
      const leadsHeight = (item.leads / maxValue) * chartHeight;
      ctx.fillStyle = "#00d4aa";
      ctx.fillRect(x, padding + chartHeight - leadsHeight, barWidth, leadsHeight);

      // Closed bar (green)
      const closedHeight = (item.closed / maxValue) * chartHeight;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(x + barWidth + 4, padding + chartHeight - closedHeight, barWidth, closedHeight);

      // Month label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      const monthLabel = new Date(item.month + "-01").toLocaleDateString("en-US", { month: "short" });
      ctx.fillText(monthLabel, x + barWidth, canvas.height - 10);
    });

    // Y-axis labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxValue / 4) * (4 - i));
      const y = padding + (chartHeight / 4) * i + 4;
      ctx.fillText(value.toString(), padding - 8, y);
    }
  }, [data]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={400} height={200} className="w-full" />
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#00d4aa] rounded" />
          <span className="text-xs text-slate-400">New Leads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-xs text-slate-400">Closed Won</span>
        </div>
      </div>
    </div>
  );
}

// Conversion funnel component
function ConversionFunnel({ categoryCounts }: { categoryCounts: Record<string, number> }) {
  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0) || 1;
  
  const stages = [
    { key: "prospect", label: "Prospects", count: categoryCounts.prospect || 0, color: "#f97316" },
    { key: "in_progress", label: "In Progress", count: categoryCounts.in_progress || 0, color: "#3b82f6" },
    { key: "completed", label: "Completed", count: categoryCounts.completed || 0, color: "#a855f7" },
    { key: "invoiced", label: "Invoiced", count: categoryCounts.invoiced || 0, color: "#22c55e" },
  ];

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => {
        const percentage = ((stage.count / total) * 100).toFixed(0);
        const width = Math.max(20, 100 - index * 15);
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <div className="w-24 text-right">
              <span className="text-sm text-slate-400">{stage.label}</span>
            </div>
            <div 
              className="h-8 rounded flex items-center justify-between px-3 transition-all"
              style={{ 
                backgroundColor: stage.color + "40",
                borderLeft: `4px solid ${stage.color}`,
                width: `${width}%`,
              }}
            >
              <span className="text-white font-semibold">{stage.count}</span>
              <span className="text-xs text-slate-300">{percentage}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const { data: stats, isLoading: statsLoading } = trpc.crm.getStats.useQuery();
  const { data: recentLeads } = trpc.crm.getLeads.useQuery({ limit: 5 });
  const { data: appointments } = trpc.crm.getAppointments.useQuery({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const { data: monthlyTrends } = trpc.crm.getMonthlyTrends.useQuery({ months: 6 });
  const { data: categoryCounts } = trpc.crm.getCategoryCounts.useQuery();
  const { data: categoryLeads } = trpc.crm.getLeadsByCategory.useQuery(
    { category: activeTab as any },
    { enabled: activeTab !== "all" }
  );

  // Calculate pipeline counts from stats
  const getPipelineCount = (stage: string) => {
    if (!stats) return 0;
    const stageMap: Record<string, number> = {
      new_lead: stats.newLeads || 0,
      contacted: 0,
      appointment_set: stats.scheduledLeads || 0,
      inspection_complete: 0,
      report_sent: 0,
      closed_won: stats.completedLeads || 0,
    };
    return stageMap[stage] || 0;
  };

  if (statsLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96 bg-slate-900">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link href="/crm/leads?new=true">
              <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                New Job
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Leads</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalLeads || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#00d4aa]" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Revenue</p>
                  <p className="text-2xl font-bold text-white">${(stats?.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {stats?.totalLeads ? ((stats.completedLeads / stats.totalLeads) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg. Deal Value</p>
                  <p className="text-2xl font-bold text-white">
                    ${stats?.completedLeads ? ((stats.totalRevenue || 0) / stats.completedLeads).toFixed(0) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            className={activeTab === "all" 
              ? "bg-[#00d4aa] text-black hover:bg-[#00b894]" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"}
            onClick={() => setActiveTab("all")}
          >
            All Jobs ({stats?.totalLeads || 0})
          </Button>
          {categoryTabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              className={activeTab === tab.key 
                ? `${tab.color} text-white hover:opacity-90` 
                : "border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({categoryCounts?.[tab.key as keyof typeof categoryCounts] || 0})
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Analytics Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lead Trends Chart */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#00d4aa]" />
                    Lead Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyTrends && monthlyTrends.length > 0 ? (
                    <LeadTrendChart data={monthlyTrends} />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-400">
                      <p>No trend data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conversion Funnel */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Conversion Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryCounts ? (
                    <ConversionFunnel categoryCounts={categoryCounts} />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-400">
                      <p>No funnel data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Current Pipeline - AccuLynx Style */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white">Current Pipeline</CardTitle>
                  <span className="text-sm text-slate-300">
                    {stats?.totalLeads || 0} Active Jobs
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap justify-center gap-4 py-4">
                  {pipelineStages.map((stage) => {
                    const count = getPipelineCount(stage.key);
                    return (
                      <Link key={stage.key} href={`/crm/leads?status=${stage.key}`}>
                        <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                          <div
                            className={`w-14 h-14 md:w-16 md:h-16 rounded-full ${stage.color} flex items-center justify-center shadow-lg`}
                          >
                            <span className="text-white text-xl md:text-2xl font-bold">
                              {stage.short}
                            </span>
                          </div>
                          <span className="mt-2 text-xs font-medium text-slate-300">
                            {stage.label}
                          </span>
                          <span className="text-lg font-bold text-white">{count}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-slate-700 mt-4">
                  <Button variant="outline" className="border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10 bg-transparent">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Link href="/crm/calendar">
                    <Button variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400/10 bg-transparent">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Inspection
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Action Items Grid */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white">
                  Action Items ({stats?.newLeads || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {actionItems.map((item) => {
                    const count = item.key === "unassigned" ? (stats?.newLeads || 0) : 
                                  item.key === "pending_inspection" ? (stats?.scheduledLeads || 0) : 0;
                    return (
                      <Link key={item.key} href={`/crm/leads?filter=${item.key}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-600 hover:bg-slate-700 cursor-pointer transition-colors">
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 truncate">{item.label}</p>
                            <p className="text-lg font-bold text-white">{count}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Today's Schedule */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#00d4aa]" />
                    Today
                  </CardTitle>
                  <Link href="/crm/calendar">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-700">
                      View Calendar
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {appointments && appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map((apt: any) => (
                      <Link key={apt.id} href={`/crm/job/${apt.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border-l-4 border-l-[#00d4aa] bg-slate-700/50 hover:bg-slate-700 cursor-pointer transition-colors">
                          <div className="w-10 h-10 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#00d4aa]" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white">{apt.fullName}</p>
                            <p className="text-sm text-slate-400">
                              {new Date(apt.scheduledDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No appointments scheduled for today</p>
                    <Link href="/crm/calendar">
                      <Button variant="link" className="mt-2 text-[#00d4aa]">
                        Schedule an inspection
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white">Activity Feed</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {recentLeads && recentLeads.length > 0 ? (
                  <div className="space-y-4">
                    {recentLeads.map((lead: any) => (
                      <Link key={lead.id} href={`/crm/job/${lead.id}`}>
                        <div className="flex gap-3 pb-4 border-b border-slate-700 last:border-0 hover:bg-slate-700/50 rounded p-2 -mx-2 cursor-pointer transition-colors">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center flex-shrink-0">
                            <span className="text-black font-semibold text-sm">
                              {lead.name?.charAt(0) || lead.fullName?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium text-[#00d4aa]">New Lead:</span>{" "}
                              <span className="font-medium text-white">{lead.name || lead.fullName}</span>
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {lead.address}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </p>
                            {lead.promoCode && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded">
                                Via: {lead.salesRepCode || lead.promoCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
