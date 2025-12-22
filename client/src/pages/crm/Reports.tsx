import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Target,
  Filter,
  Loader2,
  Calendar,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import AnalyticsMetricCard from "@/components/crm/analytics/AnalyticsMetricCard";
import PipelineVolumeChart from "@/components/crm/analytics/PipelineVolumeChart";
import RevenueTypeChart from "@/components/crm/analytics/RevenueTypeChart";
import TopSalesRepsChart from "@/components/crm/analytics/TopSalesRepsChart";
import ActivityFeed from "@/components/crm/analytics/ActivityFeed";
import AIInsightsBanner from "@/components/crm/analytics/AIInsightsBanner";

// Pipeline stages matching your 10-stage workflow
const PIPELINE_STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'appointment_set', label: 'Appointment Set' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'approved', label: 'Approved' },
  { value: 'project_scheduled', label: 'Project Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'lien_legal', label: 'Lien Legal' },
  { value: 'closed_deal', label: 'Closed Deal' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

// Statuses that count as "won" for revenue
const WON_STATUSES = ['completed', 'invoiced', 'closed_deal'];

// Chart colors
const CHART_COLORS = {
  primary: '#10b981', // emerald-500
  secondary: '#06b6d4', // cyan-500
  palette: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']
};

export default function ReportsNew() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [repFilter, setRepFilter] = useState("all");

  // Fetch data from TRPC
  const { data: stats, isLoading: statsLoading } = trpc.crm.getReportStats.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: leads, isLoading: leadsLoading } = trpc.crm.getLeadsForExport.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    salesRep: repFilter !== "all" ? repFilter : undefined,
  });

  const { data: team } = trpc.users.getTeam.useQuery();

  // Calculate enhanced metrics
  const metrics = useMemo(() => {
    if (!leads) return {
      totalLeads: 0,
      revenue: 0,
      conversionRate: 0,
      avgDealValue: 0
    };

    const totalLeads = leads.length;
    const wonJobs = leads.filter(j => WON_STATUSES.includes(j.status));
    const revenue = wonJobs.reduce((acc, curr) => acc + (curr.amountPaid / 100), 0);
    const conversionRate = totalLeads > 0 ? (wonJobs.length / totalLeads) * 100 : 0;
    const avgDealValue = wonJobs.length > 0 ? revenue / wonJobs.length : 0;

    return {
      totalLeads,
      revenue,
      conversionRate,
      avgDealValue
    };
  }, [leads]);

  // Chart Data: Pipeline Volume
  const pipelineData = useMemo(() => {
    if (!leads) return [];
    
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => counts[s.value] = 0);
    
    leads.forEach(job => {
      if (counts[job.status] !== undefined) {
        counts[job.status]++;
      }
    });

    return PIPELINE_STAGES.map(stage => ({
      name: stage.label,
      count: counts[stage.value]
    }));
  }, [leads]);

  // Chart Data: Revenue by Deal Type
  const dealTypeData = useMemo(() => {
    if (!leads) return [];
    
    const wonJobs = leads.filter(j => WON_STATUSES.includes(j.status));
    const groups: Record<string, number> = {};
    
    wonJobs.forEach(job => {
      const dealType = job.dealType || 'cash';
      groups[dealType] = (groups[dealType] || 0) + (job.amountPaid / 100);
    });

    const colors = {
      cash: "rgba(0, 212, 170, 0.8)",
      insurance: "rgba(167, 139, 250, 0.8)",
      financing: "rgba(74, 222, 128, 0.8)",
      other: "rgba(251, 191, 36, 0.8)"
    };

    return Object.keys(groups).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: groups[type],
      color: colors[type as keyof typeof colors] || "rgba(148, 163, 184, 0.8)"
    }));
  }, [leads]);

  // Chart Data: Sales Rep Performance
  const repPerformanceData = useMemo(() => {
    if (!leads) return [];
    
    const wonJobs = leads.filter(j => WON_STATUSES.includes(j.status));
    const groups: Record<string, { revenue: number; deals: number }> = {};

    wonJobs.forEach(job => {
      const rep = job.salesRepCode || 'Direct';
      if (!groups[rep]) {
        groups[rep] = { revenue: 0, deals: 0 };
      }
      groups[rep].revenue += (job.amountPaid / 100);
      groups[rep].deals += 1;
    });

    return Object.keys(groups).map(rep => {
      const initials = rep.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      return {
        name: rep,
        revenue: groups[rep].revenue,
        deals: groups[rep].deals,
        avatar: initials
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5); // Top 5
  }, [leads]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(val);

  const exportToCSV = () => {
    if (!leads || leads.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "ID", "Name", "Email", "Phone", "Address", "City/State/ZIP",
      "Status", "Deal Type", "Sales Rep", "Amount Paid", "Created Date"
    ];

    const rows = leads.map(lead => [
      lead.id,
      lead.fullName,
      lead.email,
      lead.phone,
      lead.address,
      lead.cityStateZip,
      lead.status,
      lead.dealType || 'cash',
      lead.salesRepCode || "Direct",
      (lead.amountPaid / 100).toFixed(2),
      new Date(lead.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nextdoor_leads_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully");
  };

  const exportToPDF = () => {
    if (!leads || leads.length === 0) {
      toast.error("No data to export");
      return;
    }

    const dateRange = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : "All Time";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>NextDoor CRM Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0d4f4f; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #0d4f4f; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
          .stat { background: #f0f0f0; padding: 15px; border-radius: 8px; min-width: 200px; }
        </style>
      </head>
      <body>
        <h1>NextDoor Exterior Solutions - Analytics Report</h1>
        <p>Date Range: ${dateRange}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <div class="stat"><strong>Total Leads:</strong> ${metrics.totalLeads}</div>
          <div class="stat"><strong>Revenue:</strong> ${formatCurrency(metrics.revenue)}</div>
          <div class="stat"><strong>Conversion Rate:</strong> ${metrics.conversionRate.toFixed(1)}%</div>
          <div class="stat"><strong>Avg. Deal Value:</strong> ${formatCurrency(metrics.avgDealValue)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Status</th>
              <th>Deal Type</th>
              <th>Sales Rep</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${leads.map(lead => `
              <tr>
                <td>${lead.fullName}</td>
                <td>${lead.email}</td>
                <td>${lead.phone}</td>
                <td>${lead.address}</td>
                <td>${lead.status}</td>
                <td>${lead.dealType || 'cash'}</td>
                <td>${lead.salesRepCode || "Direct"}</td>
                <td>$${(lead.amountPaid / 100).toFixed(2)}</td>
                <td>${new Date(lead.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }

    toast.success("PDF report generated");
  };

  if (statsLoading || leadsLoading) {
    return (
      <CRMLayout>
        <div className="flex min-h-screen items-center justify-center bg-slate-900">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-slate-400">Loading analytics...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="min-h-screen bg-slate-900 text-slate-100 relative">
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/95 border-b border-slate-700/50">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Reports & Analytics</h1>
                <p className="text-slate-400 text-lg">Real-time performance metrics and pipeline insights</p>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={exportToCSV} 
                  variant="outline" 
                  className="glow-border hover:bg-[#00d4aa]/10 transition-all bg-transparent border-[#00d4aa] text-[#00d4aa]"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  onClick={exportToPDF} 
                  className="bg-[#00d4aa] text-black hover:bg-[#00b894] font-semibold shadow-lg hover:shadow-[#00d4aa]/20 transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8 space-y-8">

          {/* AI Insights Banner */}
          <AIInsightsBanner />

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnalyticsMetricCard
              title="Total Leads"
              value={metrics.totalLeads.toString()}
              change="+12.5%"
              trend="up"
              icon={<Users className="w-6 h-6" />}
              iconColor="text-[#00d4aa]"
            />
            <AnalyticsMetricCard
              title="Revenue"
              value={formatCurrency(metrics.revenue)}
              change="+8.2%"
              trend="up"
              icon={<DollarSign className="w-6 h-6" />}
              iconColor="text-emerald-400"
            />
            <AnalyticsMetricCard
              title="Conversion Rate"
              value={`${metrics.conversionRate.toFixed(1)}%`}
              change="+5.1%"
              trend="up"
              icon={<Target className="w-6 h-6" />}
              iconColor="text-cyan-400"
            />
            <AnalyticsMetricCard
              title="Avg. Deal Value"
              value={formatCurrency(metrics.avgDealValue)}
              change="-2.3%"
              trend="down"
              icon={<TrendingUp className="w-6 h-6" />}
              iconColor="text-yellow-400"
            />
          </div>

          {/* Filters Section */}
          <Card className="glass-card glow-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-5 h-5 text-[#00d4aa]" />
              <h2 className="text-xl font-semibold text-white">Filter Data</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa]/20 transition-colors text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End Date
                </label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa]/20 transition-colors text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa]/20 transition-colors text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PIPELINE_STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400">Sales Rep</label>
                <Select value={repFilter} onValueChange={setRepFilter}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa]/20 transition-colors text-white">
                    <SelectValue placeholder="All Reps" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Reps</SelectItem>
                    {team?.filter((m: any) => m.role === "sales_rep").map((rep: any) => (
                      <SelectItem key={rep.id} value={rep.name || rep.email || 'unknown'}>
                        {rep.name || rep.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button className="bg-[#00d4aa] text-black hover:bg-[#00b894] font-semibold">
                <Zap className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-700/50 hover:bg-slate-800 bg-transparent text-white"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("all");
                  setRepFilter("all");
                }}
              >
                Reset
              </Button>
            </div>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PipelineVolumeChart data={pipelineData} />
            </div>
            <div className="space-y-6">
              <RevenueTypeChart data={dealTypeData} />
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopSalesRepsChart reps={repPerformanceData} />
            <ActivityFeed />
          </div>

          {/* Raw Data Table */}
          <Card className="glass-card glow-border">
            <CardHeader>
              <CardTitle className="text-white">Lead Data ({leads?.length || 0} records)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-900/50 text-xs uppercase font-medium text-slate-300">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Deal Type</th>
                      <th className="px-6 py-4">Sales Rep</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {leads && leads.length > 0 ? leads.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-700/20 transition">
                        <td className="px-6 py-4 font-medium text-white">{job.fullName}</td>
                        <td className="px-6 py-4">{job.email}</td>
                        <td className="px-6 py-4">{job.phone}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border
                            ${WON_STATUSES.includes(job.status) 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : job.status === 'closed_lost' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-slate-700 text-slate-300 border-slate-600'
                            }
                          `}>
                            {PIPELINE_STAGES.find(s => s.value === job.status)?.label || job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">{job.dealType || 'cash'}</td>
                        <td className="px-6 py-4">{job.salesRepCode || 'Direct'}</td>
                        <td className="px-6 py-4 text-right text-white font-mono">{formatCurrency(job.amountPaid / 100)}</td>
                        <td className="px-6 py-4 text-right">{new Date(job.createdAt).toLocaleDateString()}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                          No records found matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CRMLayout>
  );
}
