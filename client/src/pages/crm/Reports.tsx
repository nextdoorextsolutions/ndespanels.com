import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Filter,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

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
    })).filter(item => item.count > 0);
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

    return Object.keys(groups).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: groups[type]
    }));
  }, [leads]);

  // Chart Data: Sales Rep Performance
  const repPerformanceData = useMemo(() => {
    if (!leads) return [];
    
    const wonJobs = leads.filter(j => WON_STATUSES.includes(j.status));
    const groups: Record<string, number> = {};

    wonJobs.forEach(job => {
      const rep = job.salesRepCode || 'Direct';
      groups[rep] = (groups[rep] || 0) + (job.amountPaid / 100);
    });

    return Object.keys(groups).map(rep => ({
      name: rep,
      revenue: groups[rep]
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 10); // Top 10
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
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
            <p className="text-slate-400 mt-1">Real-time performance metrics and pipeline insights</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" className="border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Leads</p>
                  <p className="text-3xl font-bold text-white">{metrics.totalLeads}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Revenue</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(metrics.revenue)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Conversion Rate</p>
                  <p className="text-3xl font-bold text-white">{metrics.conversionRate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg. Deal Value</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(metrics.avgDealValue)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2 text-[#00d4aa] font-semibold uppercase text-xs tracking-wider">
              <Filter size={14} /> Filter Data
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-slate-300 text-xs">Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all" className="text-white hover:bg-slate-600">All Statuses</SelectItem>
                    {PIPELINE_STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-white hover:bg-slate-600">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Sales Rep</Label>
                <Select value={repFilter} onValueChange={setRepFilter}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="All Reps" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all" className="text-white hover:bg-slate-600">All Reps</SelectItem>
                    {team?.filter((m: any) => m.role === "sales_rep").map((rep: any) => (
                      <SelectItem key={rep.id} value={rep.name || rep.email || 'unknown'} className="text-white hover:bg-slate-600">
                        {rep.name || rep.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart A: Pipeline Volume */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white font-medium">Pipeline Stage Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={pipelineData}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                      cursor={{fill: '#334155', opacity: 0.4}}
                    />
                    <Bar dataKey="count" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart B: Revenue by Deal Type */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white font-medium">Revenue by Deal Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dealTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dealTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart C: Sales Rep Performance */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white font-medium">Top Sales Reps (Revenue)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={repPerformanceData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      interval={0} 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                    />
                    <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                      cursor={{fill: '#334155', opacity: 0.4}}
                    />
                    <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Raw Data Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Lead Data ({leads?.length || 0} records)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900 text-xs uppercase font-medium text-slate-300">
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
                <tbody className="divide-y divide-slate-700">
                  {leads && leads.length > 0 ? leads.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-700/50 transition">
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
    </CRMLayout>
  );
}
