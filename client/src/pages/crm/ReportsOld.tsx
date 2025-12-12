import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText, BarChart3, Users, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "appointment_set", label: "Appointment Set" },
  { value: "inspection_complete", label: "Inspection Complete" },
  { value: "report_sent", label: "Report Sent" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [repFilter, setRepFilter] = useState("all");

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

  const exportToCSV = () => {
    if (!leads || leads.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "ID", "Name", "Email", "Phone", "Address", "City/State/ZIP",
      "Roof Age", "Status", "Priority", "Promo Code", "Sales Rep",
      "Amount Paid", "Hands-On", "Created Date"
    ];

    const rows = leads.map(lead => [
      lead.id,
      lead.fullName,
      lead.email,
      lead.phone,
      lead.address,
      lead.cityStateZip,
      lead.roofAge || "",
      lead.status,
      lead.priority,
      lead.promoCode || "",
      lead.salesRepCode || "",
      (lead.amountPaid / 100).toFixed(2),
      lead.handsOnInspection ? "Yes" : "No",
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
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .stat { background: #f0f0f0; padding: 15px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>NextDoor Exterior Solutions - Lead Report</h1>
        <p>Date Range: ${dateRange}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <div class="stat"><strong>Total Leads:</strong> ${stats?.totalLeads || 0}</div>
          <div class="stat"><strong>Revenue:</strong> $${Number(stats?.totalRevenue || 0).toFixed(2)}</div>
          <div class="stat"><strong>Conversion Rate:</strong> ${isNaN(Number(stats?.conversionRate)) ? '0.0' : Number(stats?.conversionRate || 0).toFixed(1)}%</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Status</th>
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

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
            <p className="text-sm text-slate-400">Export data and view performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={exportToCSV} variant="outline" className="border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10 bg-transparent">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Leads</p>
                  <p className="text-3xl font-bold text-white">{stats?.totalLeads || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Revenue</p>
                  <p className="text-3xl font-bold text-white">${stats?.totalRevenue?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Conversion Rate</p>
                  <p className="text-3xl font-bold text-white">{isNaN(Number(stats?.conversionRate)) ? '0.0' : Number(stats?.conversionRate || 0).toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg. Value</p>
                  <p className="text-3xl font-bold text-white">
                    ${stats?.totalLeads ? (stats.totalRevenue / stats.totalLeads).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-sm bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Filter Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-slate-300">Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-slate-600">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Sales Rep</Label>
                <Select value={repFilter} onValueChange={setRepFilter}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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

        {/* Data Table */}
        <Card className="shadow-sm bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Lead Data ({leads?.length || 0} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700/50 border-slate-600">
                    <TableHead className="font-semibold text-slate-300">Name</TableHead>
                    <TableHead className="font-semibold text-slate-300">Email</TableHead>
                    <TableHead className="font-semibold text-slate-300">Phone</TableHead>
                    <TableHead className="font-semibold text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-300">Sales Rep</TableHead>
                    <TableHead className="font-semibold text-slate-300">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-300">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads?.map(lead => (
                    <TableRow key={lead.id} className="hover:bg-slate-700/50 border-slate-700">
                      <TableCell className="font-medium text-white">{lead.fullName}</TableCell>
                      <TableCell className="text-slate-300">{lead.email}</TableCell>
                      <TableCell className="text-slate-300">{lead.phone}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-600/50 text-slate-300">
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-300">{lead.salesRepCode || "Direct"}</TableCell>
                      <TableCell className="text-white">${(lead.amountPaid / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-slate-300">{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!leads || leads.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        No data found for the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
