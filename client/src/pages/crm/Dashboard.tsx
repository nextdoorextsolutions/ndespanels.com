import { useState } from "react";
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

const actionItems = [
  { key: "unassigned", label: "Unassigned Leads", icon: Users, color: "text-orange-400" },
  { key: "follow_up", label: "Needs Follow-up", icon: Phone, color: "text-yellow-400" },
  { key: "pending_inspection", label: "Pending Inspection", icon: Calendar, color: "text-blue-400" },
  { key: "lien_warning", label: "Lien Rights Warning", icon: AlertTriangle, color: "text-yellow-500" },
  { key: "lien_critical", label: "Lien Rights Critical", icon: AlertCircle, color: "text-red-500" },
  { key: "overdue", label: "Overdue Tasks", icon: Clock, color: "text-red-400" },
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

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <div key={stage.label} className="flex items-center gap-3 group">
          <div className="w-20 text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{stage.label}</div>
          <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${stage.color} opacity-80 group-hover:opacity-100 transition-all duration-500`}
              style={{ width: `${(stage.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="w-10 text-right text-sm font-bold text-white">{stage.count}</div>
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
        toast.error(result.error || "Failed to send lien rights alert.");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send alert.");
    },
  });

  return (
    <Button
      variant="outline"
      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 transition-all bg-transparent"
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
        <div className="flex items-center justify-center h-96 bg-[#0f111a]">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="p-6 bg-[#0f111a] min-h-screen font-sans text-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/crm/leads?new=true">
              <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-bold shadow-lg shadow-teal-900/20 transition-all border-none">
                <Plus className="w-4 h-4 mr-2" />
                New Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {lienRightsJobs && lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length > 0 && (
          <div className="mb-8 p-1 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30">
            <div className="bg-[#151720] rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">Lien Rights Critical Alert!</h3>
                <p className="text-sm text-gray-400">
                  {lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length} jobs have less than <span className="text-red-400 font-bold">14 days</span> remaining.
                  <Link href="/crm/pipeline" className="text-[#00d4aa] ml-2 hover:text-[#00b894] font-medium hover:underline">
                    View Pipeline →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Leads */}
          <Card className="bg-[#1e293b] border-gray-800 shadow-sm hover:border-gray-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Leads</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats?.totalLeads || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#00d4aa]/10 flex items-center justify-center border border-[#00d4aa]/20">
                  <Users className="w-6 h-6 text-[#00d4aa]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Revenue */}
          <Card className="bg-[#1e293b] border-gray-800 shadow-sm hover:border-gray-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Revenue</p>
                  <p className="text-3xl font-bold text-white mt-1">${(stats?.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Conversion Rate */}
          <Card className="bg-[#1e293b] border-gray-800 shadow-sm hover:border-gray-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats?.totalLeads ? ((stats.closedDealCount / stats.totalLeads) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Target className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Avg Deal Value */}
          <Card className="bg-[#1e293b] border-gray-800 shadow-sm hover:border-gray-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Avg. Deal Value</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    ${stats?.closedDealCount ? ((stats.totalRevenue || 0) / stats.closedDealCount).toFixed(0) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deal Types Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/crm/leads?filter=insurance">
            <Card className="bg-[#1e293b] border-gray-800 hover:bg-[#253045] cursor-pointer transition-all group border-l-4 border-l-blue-500">
              <CardContent className="p-5 flex items-center gap-4">
                <Shield className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-sm text-gray-400">Insurance Deals</p>
                  <p className="text-xl font-bold text-white">{stats?.insuranceCount || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/crm/leads?filter=cash">
            <Card className="bg-[#1e293b] border-gray-800 hover:bg-[#253045] cursor-pointer transition-all group border-l-4 border-l-green-500">
              <CardContent className="p-5 flex items-center gap-4">
                <Banknote className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-sm text-gray-400">Cash Deals</p>
                  <p className="text-xl font-bold text-white">{stats?.cashCount || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/crm/leads?filter=financed">
            <Card className="bg-[#1e293b] border-gray-800 hover:bg-[#253045] cursor-pointer transition-all group border-l-4 border-l-purple-500">
              <CardContent className="p-5 flex items-center gap-4">
                <CreditCard className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-sm text-gray-400">Financed Deals</p>
                  <p className="text-xl font-bold text-white">{stats?.financedCount || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pipeline Tracker */}
        <Card className="bg-[#1e293b] border-gray-800 mb-8 overflow-hidden">
          <CardHeader className="border-b border-gray-800/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Pipeline Overview</CardTitle>
              <Link href="/crm/pipeline">
                <Button variant="ghost" size="sm" className="text-[#00d4aa] hover:text-[#00b894] hover:bg-[#00d4aa]/10">
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
              <Card className="bg-[#1e293b] border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#00d4aa]" />
                    Lead Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LeadTrendsChart data={monthlyTrends || []} />
                </CardContent>
              </Card>

              {/* Conversion Funnel */}
              <Card className="bg-[#1e293b] border-gray-800">
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
            <Card className="bg-[#1e293b] border-gray-800">
              <CardHeader className="pb-4 border-b border-gray-800/50">
                <CardTitle className="text-lg font-semibold text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3">
                  <Link href="/crm/leads?new=true">
                    <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold border-none">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Job
                    </Button>
                  </Link>
                  <Link href="/crm/reports">
                    <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 bg-transparent">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </Link>
                  <Link href="/crm/calendar">
                    <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 bg-transparent">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Inspection
                    </Button>
                  </Link>
                  <SendLienRightsAlertButton />
                </div>
              </CardContent>
            </Card>

            {/* Action Items Grid */}
            <Card className="bg-[#1e293b] border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white">Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {actionItems.map((item) => {
                    const count = getActionCount(item.key);
                    return (
                      <Link key={item.key} href={`/crm/leads?filter=${item.key}`}>
                        <div className={`
                          flex items-center gap-3 p-4 rounded-xl border border-gray-800 
                          hover:bg-[#253045] hover:border-gray-700 cursor-pointer transition-all
                          ${item.key.includes('lien') && count > 0 ? 'border-red-500/40 bg-red-500/5' : 'bg-[#151720]'}
                        `}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 truncate uppercase tracking-wider mb-1">{item.label}</p>
                            <p className="text-xl font-bold text-white">{count}</p>
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
            <Card className="bg-[#1e293b] border-gray-800">
              <CardHeader className="pb-4 border-b border-gray-800/50">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-red-400" />
                  Lien Rights (90 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <span className="text-green-400 text-sm font-medium">Active</span>
                    <span className="font-bold text-white bg-green-500/20 px-2 py-0.5 rounded text-sm">
                      {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "active").length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <span className="text-yellow-400 text-sm font-medium">Warning</span>
                    <span className="font-bold text-white bg-yellow-500/20 px-2 py-0.5 rounded text-sm">
                      {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "warning").length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-red-400 text-sm font-medium">Critical</span>
                    <span className="font-bold text-white bg-red-500/20 px-2 py-0.5 rounded text-sm">
                      {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "critical").length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Schedule */}
            <Card className="bg-[#1e293b] border-gray-800">
              <CardHeader className="pb-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#00d4aa]" />
                    Today
                  </CardTitle>
                  <Link href="/crm/calendar">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700 h-8">
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
                        <div className="flex items-center gap-3 p-3 rounded-lg border-l-2 border-l-[#00d4aa] bg-[#151720] hover:bg-[#253045] cursor-pointer transition-colors group">
                          <div className="flex-1">
                            <p className="font-medium text-white group-hover:text-[#00d4aa] transition-colors">{apt.fullName}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(apt.scheduledDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No appointments today</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-[#1e293b] border-gray-800">
              <CardHeader className="pb-4 border-b border-gray-800/50">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  {categoryLeads && categoryLeads.length > 0 ? (
                    categoryLeads.slice(0, 5).map((lead: any) => (
                      <Link key={lead.id} href={`/crm/job/${lead.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#253045] cursor-pointer transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#009688] flex items-center justify-center shadow-lg shadow-teal-900/20">
                            <span className="text-black font-bold text-xs">
                              {lead.fullName?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{lead.fullName}</p>
                            <p className="text-xs text-gray-500">{lead.status}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4 text-sm">No recent activity</p>
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