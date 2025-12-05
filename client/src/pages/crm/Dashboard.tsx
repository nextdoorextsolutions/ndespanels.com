import { useRef, useEffect, useState } from "react";
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
  AlertTriangle,
  Shield,
  Banknote,
  CreditCard,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/crm/CRMLayout";

// New pipeline stage configuration
const pipelineStages = [
  { key: "lead", label: "Lead", short: "L", color: "bg-orange-500" },
  { key: "appointment_set", label: "Appt Set", short: "A", color: "bg-yellow-500" },
  { key: "prospect", label: "Prospect", short: "P", color: "bg-blue-500" },
  { key: "approved", label: "Approved", short: "V", color: "bg-purple-500" },
  { key: "project_scheduled", label: "Scheduled", short: "S", color: "bg-indigo-500" },
  { key: "completed", label: "Completed", short: "C", color: "bg-teal-500" },
  { key: "invoiced", label: "Invoiced", short: "I", color: "bg-cyan-500" },
  { key: "lien_legal", label: "Lien Legal", short: "LL", color: "bg-red-500" },
  { key: "closed_deal", label: "Closed", short: "W", color: "bg-green-500" },
];

// Category tabs configuration - updated for new pipeline
const categoryTabs = [
  { key: "lead", label: "Leads", color: "bg-orange-500" },
  { key: "appointment_set", label: "Appt Set", color: "bg-yellow-500" },
  { key: "prospect", label: "Prospects", color: "bg-blue-500" },
  { key: "approved", label: "Approved", color: "bg-purple-500" },
  { key: "project_scheduled", label: "Scheduled", color: "bg-indigo-500" },
  { key: "completed", label: "Completed", color: "bg-teal-500" },
  { key: "invoiced", label: "Invoiced", color: "bg-cyan-500" },
  { key: "closed_deal", label: "Closed", color: "bg-green-500" },
  { key: "closed_lost", label: "Lost", color: "bg-red-500" },
];

// Action items configuration
const actionItems = [
  { key: "unassigned", label: "Unassigned Leads", icon: Users, color: "text-orange-400" },
  { key: "follow_up", label: "Needs Follow-up", icon: Phone, color: "text-yellow-400" },
  { key: "pending_inspection", label: "Pending Inspection", icon: Calendar, color: "text-blue-400" },
  { key: "lien_warning", label: "Lien Rights Warning", icon: AlertTriangle, color: "text-yellow-500" },
  { key: "lien_critical", label: "Lien Rights Critical", icon: AlertCircle, color: "text-red-500" },
  { key: "overdue", label: "Overdue Tasks", icon: Clock, color: "text-red-400" },
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
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.month, x + barWidth, canvas.height - 10);
    });

    // Legend
    ctx.fillStyle = "#00d4aa";
    ctx.fillRect(padding, 10, 12, 12);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Leads", padding + 18, 20);

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(padding + 70, 10, 12, 12);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Closed", padding + 88, 20);
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={200}
      className="w-full h-[200px]"
    />
  );
}

// Conversion funnel component
function ConversionFunnel({ stats }: { stats: any }) {
  if (!stats) return null;

  const stages = [
    { label: "Leads", count: stats.leadCount || 0, color: "bg-orange-500" },
    { label: "Prospects", count: stats.prospectCount || 0, color: "bg-blue-500" },
    { label: "Approved", count: stats.approvedCount || 0, color: "bg-purple-500" },
    { label: "Completed", count: stats.completedCount || 0, color: "bg-teal-500" },
    { label: "Closed", count: stats.closedDealCount || 0, color: "bg-green-500" },
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex items-center gap-3">
          <div className="w-20 text-xs text-slate-400">{stage.label}</div>
          <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${stage.color} transition-all duration-500`}
              style={{ width: `${(stage.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="w-10 text-right text-sm font-semibold text-white">{stage.count}</div>
        </div>
      ))}
    </div>
  );
}

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: stats, isLoading: statsLoading } = trpc.crm.getStats.useQuery();
  const { data: appointments } = trpc.crm.getAppointments.useQuery({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const { data: monthlyTrends } = trpc.crm.getMonthlyTrends.useQuery({ months: 6 });
  const { data: categoryCounts } = trpc.crm.getCategoryCounts.useQuery();
  const { data: lienRightsJobs } = trpc.crm.getLienRightsJobs.useQuery();
  const { data: categoryLeads } = trpc.crm.getLeadsByCategory.useQuery(
    { category: activeTab as any },
    { enabled: activeTab !== "all" }
  );

  // Calculate pipeline counts from stats
  const getPipelineCount = (stage: string) => {
    if (!stats) return 0;
    const stageMap: Record<string, number> = {
      lead: stats.leadCount || 0,
      appointment_set: stats.appointmentSetCount || 0,
      prospect: stats.prospectCount || 0,
      approved: stats.approvedCount || 0,
      project_scheduled: stats.projectScheduledCount || 0,
      completed: stats.completedCount || 0,
      invoiced: stats.invoicedCount || 0,
      lien_legal: stats.lienLegalCount || 0,
      closed_deal: stats.closedDealCount || 0,
    };
    return stageMap[stage] || 0;
  };

  // Get action item counts
  const getActionCount = (key: string) => {
    if (!stats) return 0;
    switch (key) {
      case "unassigned":
        return stats.leadCount || 0;
      case "pending_inspection":
        return stats.appointmentSetCount || 0;
      case "lien_warning":
        return stats.lienWarningCount || 0;
      case "lien_critical":
        return stats.lienCriticalCount || 0;
      default:
        return 0;
    }
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

        {/* Lien Rights Alert Banner */}
        {lienRightsJobs && lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-900/50 to-orange-900/50 border border-red-500/50 rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-white">Lien Rights Critical Alert!</h3>
                <p className="text-sm text-slate-300">
                  {lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length} jobs have less than 14 days remaining on lien rights. 
                  <Link href="/crm/pipeline" className="text-[#00d4aa] ml-1 hover:underline">View Pipeline →</Link>
                </p>
              </div>
            </div>
          </div>
        )}

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
                    {stats?.totalLeads ? ((stats.closedDealCount / stats.totalLeads) * 100).toFixed(1) : 0}%
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
                    ${stats?.closedDealCount ? ((stats.totalRevenue || 0) / stats.closedDealCount).toFixed(0) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deal Type Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">Insurance Deals</p>
                  <p className="text-xl font-bold text-white">{stats?.insuranceCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Banknote className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm text-slate-400">Cash Deals</p>
                  <p className="text-xl font-bold text-white">{stats?.cashCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700 border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-sm text-slate-400">Financed Deals</p>
                  <p className="text-xl font-bold text-white">{stats?.financedCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Badges */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Pipeline Overview</h3>
              <Link href="/crm/pipeline">
                <Button variant="ghost" size="sm" className="text-[#00d4aa] hover:text-[#00b894]">
                  View Pipeline <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {pipelineStages.map((stage) => (
                <Link key={stage.key} href={`/crm/pipeline?stage=${stage.key}`}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${stage.color} bg-opacity-20 hover:bg-opacity-30 cursor-pointer transition-colors`}>
                    <span className={`w-6 h-6 rounded-full ${stage.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {stage.short}
                    </span>
                    <span className="text-white text-sm">{stage.label}</span>
                    <span className="text-white font-bold">{getPipelineCount(stage.key)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

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
                  <ConversionFunnel stats={stats} />
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Link href="/crm/leads?new=true">
                    <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Job
                    </Button>
                  </Link>
                  <Link href="/crm/reports">
                    <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400/10 bg-transparent">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </Link>
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
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {actionItems.map((item) => {
                    const count = getActionCount(item.key);
                    return (
                      <Link key={item.key} href={`/crm/leads?filter=${item.key}`}>
                        <div className={`flex items-center gap-3 p-3 rounded-lg border border-slate-600 hover:bg-slate-700 cursor-pointer transition-colors ${item.key.includes('lien') && count > 0 ? 'border-red-500/50 animate-pulse' : ''}`}>
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
            {/* Lien Rights Summary */}
            {lienRightsJobs && lienRightsJobs.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-red-400" />
                    Lien Rights (90 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/30">
                      <span className="text-green-400 text-sm">Active (60+ days)</span>
                      <span className="font-bold text-white">{lienRightsJobs.filter((j: any) => j.urgencyLevel === "active").length}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                      <span className="text-yellow-400 text-sm">Warning (15-30 days)</span>
                      <span className="font-bold text-white">{lienRightsJobs.filter((j: any) => j.urgencyLevel === "warning").length}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/30 animate-pulse">
                      <span className="text-red-400 text-sm">Critical (&lt;14 days)</span>
                      <span className="font-bold text-white">{lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-600/30 border border-slate-600">
                      <span className="text-slate-400 text-sm">Expired</span>
                      <span className="font-bold text-white">{lienRightsJobs.filter((j: any) => j.urgencyLevel === "expired").length}</span>
                    </div>
                  </div>
                  <Link href="/crm/pipeline">
                    <Button variant="ghost" size="sm" className="w-full mt-3 text-[#00d4aa] hover:text-[#00b894]">
                      View All in Pipeline <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

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
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryLeads && categoryLeads.length > 0 ? (
                    categoryLeads.slice(0, 5).map((lead: any) => (
                      <Link key={lead.id} href={`/crm/job/${lead.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-700 cursor-pointer transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center">
                            <span className="text-black font-semibold text-xs">
                              {lead.fullName?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{lead.fullName}</p>
                            <p className="text-xs text-slate-400">{lead.status}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
