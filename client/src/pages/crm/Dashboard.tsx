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
import AIInsightsBanner from "@/components/crm/analytics/AIInsightsBanner";

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
      <div className="min-h-screen bg-slate-900 text-slate-100 relative">
        <div className="p-6 pb-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-slate-400 text-lg">Welcome back, here's what's happening today.</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/crm/leads?new=true">
                <Button className="bg-[#00d4aa] text-black hover:bg-[#00b894] font-semibold shadow-lg hover:shadow-[#00d4aa]/20 transition-all">
                  <Plus className="w-4 h-4 mr-2" />
                  New Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Alerts */}
          {lienRightsJobs && lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length > 0 && (
            <div className="mb-8 glass-card glow-border bg-red-900/20 border-red-500/30 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10" />
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg mb-1">Lien Rights Critical Alert!</h3>
                  <p className="text-sm text-slate-300">
                    <span className="text-white font-bold">{lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length}</span> jobs have less than <span className="text-red-400 font-bold">14 days</span> remaining.
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

          {/* AI Insights Banner */}
          <div className="mb-8">
            <AIInsightsBanner />
          </div>

          {/* KPI Cards & Deal Types - Extracted Component */}
          <DashboardStats stats={stats} userRole={permissions?.role} />

          {/* Pipeline Tracker */}
          <Card className="mb-8 glass-card glow-border bg-slate-800/60 border-slate-700/50">
            <CardHeader className="border-b border-slate-700/30 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-white">Pipeline Overview</CardTitle>
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
      </div>
    </CRMLayout>
  );
}