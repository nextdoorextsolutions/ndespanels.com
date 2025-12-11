import React, { useState } from "react";
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
  TrendingUp,
  DollarSign,
  BarChart3,
  Target,
  AlertTriangle,
  Shield,
  Banknote,
  CreditCard,
  Gavel,
  Bell,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/crm/CRMLayout";
import { PipelineOverview } from "@/components/PipelineOverview";
import { LeadTrendsChart } from "@/components/crm/LeadTrendsChart";

// --- Configuration ---
const actionItems = [
  { key: "unassigned", label: "Unassigned Leads", icon: Users, color: "text-orange-500 dark:text-orange-400" },
  { key: "follow_up", label: "Needs Follow-up", icon: Phone, color: "text-yellow-500 dark:text-yellow-400" },
  { key: "pending_inspection", label: "Pending Inspection", icon: Calendar, color: "text-blue-500 dark:text-blue-400" },
  { key: "lien_warning", label: "Lien Rights Warning", icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-500" },
  { key: "lien_critical", label: "Lien Rights Critical", icon: AlertCircle, color: "text-red-600 dark:text-red-500" },
  { key: "overdue", label: "Overdue Tasks", icon: Clock, color: "text-red-500 dark:text-red-400" },
];

// --- Sub-Components ---

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
          <div className="w-20 text-xs font-semibold text-slate-500 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors uppercase tracking-wide">{stage.label}</div>
          <div className="flex-1 h-2.5 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${stage.color} opacity-80 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
              style={{ width: `${(stage.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="w-10 text-right text-sm font-bold text-slate-900 dark:text-white">{stage.count}</div>
        </div>
      ))}
    </div>
  );
}

function SendLienRightsAlertButton() {
  const sendAlert = trpc.crm.sendLienRightsAlert.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        if (result.warningCount === 0 && result.criticalCount === 0) {
          toast.info("No jobs requiring lien rights alerts at this time.");
        } else {
          toast.success(`Lien rights alert sent for ${result.criticalCount} critical and ${result.warningCount} warning jobs.`);
        }
      } else {
        toast.error((result as any).error || "Failed to send lien rights alert.");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send alert.");
    },
  });

  return (
    <Button
      variant="outline"
      className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-700 dark:hover:text-red-300 transition-all bg-transparent"
      onClick={() => sendAlert.mutate({})}
      disabled={sendAlert.isPending}
    >
      {sendAlert.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Bell className="w-4 h-4 mr-2" />
      )}
      Send Lien Rights Alert
    </Button>
  );
}

// --- Main Component ---

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [todayDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Data Fetching
  const { data: stats, isLoading: statsLoading } = trpc.crm.getStats.useQuery(undefined, { staleTime: 30 * 1000 });
  const { data: appointments } = trpc.crm.getAppointments.useQuery({ startDate: todayDate, endDate: todayDate });
  const { data: monthlyTrends } = trpc.crm.getMonthlyTrends.useQuery({ months: 6 }, { staleTime: 5 * 60 * 1000 });
  const { data: categoryCounts } = trpc.crm.getCategoryCounts.useQuery(undefined, { staleTime: 60 * 1000 });
  const { data: lienRightsJobs } = trpc.crm.getLienRightsJobs.useQuery(undefined, { staleTime: 2 * 60 * 1000 });
  const { data: categoryLeads } = trpc.crm.getLeadsByCategory.useQuery(
    { category: activeTab as any },
    { enabled: activeTab !== "all" }
  );

  const getActionCount = (key: string) => {
    if (!stats) return 0;
    switch (key) {
      case "unassigned": return stats.leadCount || 0;
      case "pending_inspection": return stats.appointmentSetCount || 0;
      case "lien_warning": return stats.lienWarningCount || 0;
      case "lien_critical": return stats.lienCriticalCount || 0;
      default: return 0;
    }
  };

  if (statsLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-full min-h-screen bg-slate-50 dark:bg-[#0f111a]">
          <div className="flex flex-col items-center gap-4">
             <div className="animate-spin w-10 h-10 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
             <p className="text-slate-400 dark:text-gray-400 animate-pulse text-sm">Loading Dashboard...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-50 dark:bg-[#0f111a] min-h-screen font-sans text-slate-900 dark:text-gray-100 pb-20 transition-colors duration-300">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Welcome back, here's what's happening today.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/crm/leads?new=true">
              <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-bold shadow-[0_0_15px_rgba(0,212,170,0.3)] transition-all border-none">
                <Plus className="w-4 h-4 mr-2" />
                New Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {lienRightsJobs && lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length > 0 && (
          <div className="mb-8 p-[1px] rounded-xl bg-gradient-to-r from-red-500/40 via-orange-500/40 to-red-500/40 animate-gradient-x">
            <div className="bg-white dark:bg-[#151720] rounded-[11px] p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-red-500/5 z-0" />
              <div className="relative z-10 p-2 bg-red-500/10 dark:bg-red-500/20 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Lien Rights Critical Alert!</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  <span className="text-slate-900 dark:text-white font-bold">{lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length}</span> jobs have less than <span className="text-red-500 dark:text-red-400 font-bold">14 days</span> remaining.
                  <Link href="/crm/pipeline">
                     <span className="text-[#00d4aa] ml-2 hover:text-[#00b894] font-medium hover:underline cursor-pointer">
                      View Pipeline →
                     </span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Leads */}
          <Card className="shadow-lg hover:border-slate-300 dark:hover:border-gray-700 transition-colors group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors">Total Leads</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">{stats?.totalLeads || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#00d4aa]/10 flex items-center justify-center border border-[#00d4aa]/20 group-hover:bg-[#00d4aa]/20 group-hover:scale-110 transition-all duration-300">
                  <Users className="w-6 h-6 text-[#00d4aa]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Revenue */}
          <Card className="shadow-lg hover:border-slate-300 dark:hover:border-gray-700 transition-colors group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors">Revenue</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">${(stats?.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:bg-green-500/20 group-hover:scale-110 transition-all duration-300">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Conversion Rate */}
          <Card className="shadow-lg hover:border-slate-300 dark:hover:border-gray-700 transition-colors group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors">Conversion Rate</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">
                    {stats?.totalLeads ? ((stats.closedDealCount / stats.totalLeads) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300">
                  <Target className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Avg Deal Value */}
          <Card className="shadow-lg hover:border-slate-300 dark:hover:border-gray-700 transition-colors group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors">Avg. Deal Value</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">
                    ${stats?.closedDealCount ? ((stats.totalRevenue || 0) / stats.closedDealCount).toFixed(0) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deal Types Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/crm/leads?filter=insurance">
            <Card className="hover:bg-slate-50 dark:hover:bg-[#253045] cursor-pointer transition-all group border-l-4 border-l-blue-500 shadow-md hover:shadow-xl hover:translate-y-[-2px] duration-300">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                  <Shield className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Insurance Deals</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.insuranceCount || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/crm/leads?filter=cash">
            <Card className="hover:bg-slate-50 dark:hover:bg-[#253045] cursor-pointer transition-all group border-l-4 border-l-green-500 shadow-md hover:shadow-xl hover:translate-y-[-2px] duration-300">
              <CardContent className="p-5 flex items-center gap-4">
                 <div className="p-3 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                  <Banknote className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Cash Deals</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.cashCount || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/crm/leads?filter=financed">
            <Card className="hover:bg-slate-50 dark:hover:bg-[#253045] cursor-pointer transition-all group border-l-4 border-l-purple-500 shadow-md hover:shadow-xl hover:translate-y-[-2px] duration-300">
              <CardContent className="p-5 flex items-center gap-4">
                 <div className="p-3 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
                   <CreditCard className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
                 </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Financed Deals</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.financedCount || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pipeline Tracker */}
        <Card className="mb-8 overflow-hidden shadow-lg">
          <CardHeader className="border-b border-slate-200 dark:border-gray-800/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Pipeline Overview</CardTitle>
              <Link href="/crm/pipeline">
                <Button variant="ghost" size="sm" className="text-[#00d4aa] hover:text-[#00b894] hover:bg-[#00d4aa]/10 transition-colors">
                  View Full Pipeline <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <PipelineOverview stats={stats} />
          </CardContent>
        </Card>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN (Charts & Actions) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lead Trends */}
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#00d4aa]" />
                    Lead Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <LeadTrendsChart data={monthlyTrends || []} />
                </CardContent>
              </Card>

              {/* Conversion Funnel */}
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Conversion Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ConversionFunnel stats={stats} />
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4 border-b border-slate-200 dark:border-gray-800/50">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3">
                  <Link href="/crm/leads?new=true">
                    <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold border-none shadow-[0_4px_14px_0_rgba(0,212,170,0.39)]">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Job
                    </Button>
                  </Link>
                  <Link href="/crm/reports">
                    <Button variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-500/50 bg-transparent transition-all">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </Link>
                  <Link href="/crm/calendar">
                    <Button variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-500/50 bg-transparent transition-all">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Inspection
                    </Button>
                  </Link>
                  <SendLienRightsAlertButton />
                </div>
              </CardContent>
            </Card>

            {/* Action Items Grid */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {actionItems.map((item) => {
                    const count = getActionCount(item.key);
                    const isAlert = item.key.includes('lien') && count > 0;
                    return (
                      <Link key={item.key} href={`/crm/leads?filter=${item.key}`}>
                        <div className={`
                          flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer group
                          ${isAlert 
                            ? 'border-red-500/40 bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10' 
                            : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-[#151720] hover:bg-slate-50 dark:hover:bg-[#253045] hover:border-slate-300 dark:hover:border-gray-700'}
                        `}>
                          <div className={`p-2 rounded-lg ${isAlert ? 'bg-red-500/20' : 'bg-slate-100 dark:bg-gray-800/50 group-hover:bg-slate-200 dark:group-hover:bg-gray-700'}`}>
                             <item.icon className={`w-5 h-5 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 dark:text-gray-500 font-medium truncate uppercase tracking-wider mb-1">{item.label}</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{count}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (Sidebar) */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Lien Rights Summary */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4 border-b border-slate-200 dark:border-gray-800/50">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-red-500 dark:text-red-400" />
                  Lien Rights (90 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors">
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">Active</span>
                    <span className="font-bold text-slate-900 dark:text-white bg-green-500/20 px-2.5 py-1 rounded text-sm">
                      {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "active").length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors">
                    <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Warning</span>
                    <span className="font-bold text-slate-900 dark:text-white bg-yellow-500/20 px-2.5 py-1 rounded text-sm">
                      {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "warning").length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                    <span className="text-red-600 dark:text-red-400 text-sm font-medium">Critical</span>
                    <span className="font-bold text-slate-900 dark:text-white bg-red-500/20 px-2.5 py-1 rounded text-sm animate-pulse">
                      {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "critical").length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Schedule */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4 border-b border-slate-200 dark:border-gray-800/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#00d4aa]" />
                    Today
                  </CardTitle>
                  <Link href="/crm/calendar">
                    <Button variant="ghost" size="sm" className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700/50 h-8">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {appointments && appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map((apt: any) => (
                      <Link key={apt.id} href={`/crm/job/${apt.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border-l-[3px] border-l-[#00d4aa] bg-white dark:bg-[#151720] hover:bg-slate-50 dark:hover:bg-[#253045] cursor-pointer transition-colors group shadow-sm">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-[#00d4aa] transition-colors">{apt.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-500 flex items-center gap-1 mt-1 group-hover:text-slate-700 dark:group-hover:text-gray-400">
                              <Clock className="w-3 h-3" />
                              {new Date(apt.scheduledDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-gray-600 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 dark:text-gray-500 text-sm">No appointments today</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4 border-b border-slate-200 dark:border-gray-800/50">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {categoryLeads && categoryLeads.length > 0 ? (
                    categoryLeads.slice(0, 5).map((lead: any) => (
                      <Link key={lead.id} href={`/crm/job/${lead.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-[#253045] cursor-pointer transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#009688] flex items-center justify-center shadow-lg shadow-teal-900/20 group-hover:shadow-teal-900/40 transition-shadow">
                            <span className="text-black font-bold text-xs">
                              {lead.fullName?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-gray-200 group-hover:text-slate-900 dark:group-hover:text-white truncate transition-colors">{lead.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-400">{lead.status}</p>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-gray-600 group-hover:text-slate-500 dark:group-hover:text-gray-500">
                            2h ago
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-center text-slate-500 dark:text-gray-500 py-4 text-sm">No recent activity</p>
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