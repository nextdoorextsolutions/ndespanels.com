import { useState } from "react";
import { Link } from "wouter";
import { Plus, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/crm/CRMLayout";
import { PipelineOverview } from "@/components/PipelineOverview";

// Dashboard Components
import { DashboardStats } from "@/components/crm/dashboard/DashboardStats";
import { DashboardCharts } from "@/components/crm/dashboard/DashboardCharts";
import { RecentActivity } from "@/components/crm/dashboard/RecentActivity";
import { ActionableWidgets } from "@/components/crm/dashboard/ActionableWidgets";

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [todayDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Data Fetching
  const { data: stats, isLoading: statsLoading } = trpc.crm.getStats.useQuery(undefined, { staleTime: 30 * 1000 });
  const { data: appointments } = trpc.crm.getAppointments.useQuery({ startDate: todayDate, endDate: todayDate });
  const { data: monthlyTrends } = trpc.crm.getMonthlyTrends.useQuery({ months: 6 }, { staleTime: 5 * 60 * 1000 });
  const { data: lienRightsJobs } = trpc.crm.getLienRightsJobs.useQuery(undefined, { staleTime: 2 * 60 * 1000 });
  const { data: categoryLeads } = trpc.crm.getLeadsByCategory.useQuery(
    { category: activeTab as any },
    { enabled: activeTab !== "all" }
  );
  const { data: permissions } = trpc.users.getMyPermissions.useQuery();

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

        {/* KPI Cards & Deal Types - Extracted Component */}
        <DashboardStats stats={stats} userRole={permissions?.role} />

        {/* Pipeline Tracker */}
        <Card className="mb-8 overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <CardHeader className="border-b border-gray-800/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white tracking-tight">Pipeline Overview</CardTitle>
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
            {/* Charts - Extracted Component */}
            <DashboardCharts monthlyTrends={monthlyTrends || []} stats={stats} />
            
            {/* Actionable Widgets - Extracted Component */}
            <ActionableWidgets 
              stats={stats} 
              lienRightsJobs={lienRightsJobs || []} 
              todayDate={todayDate}
              appointments={appointments || []}
            />
          </div>

          {/* RIGHT COLUMN (Sidebar) */}
          <div className="lg:col-span-1">
            {/* Recent Activity - Extracted Component */}
            <RecentActivity categoryLeads={categoryLeads || []} />
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}