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

  const { data: team } = trpc.crm.getTeam.useQuery();

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
          <div class="stat"><strong>Conversion Rate:</strong> ${Number(stats?.conversionRate || 0).toFixed(1)}%</div>
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
      <div className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500">Export data and view performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={exportToCSV} variant="outline" className="border-[#00d4aa] text-[#00d4aa]">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalLeads || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${stats?.totalRevenue?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{Number(stats?.conversionRate || 0).toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg. Value</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${stats?.totalLeads ? (stats.totalRevenue / stats.totalLeads).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Filter Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-700">Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border-gray-200"
                />
              </div>
              <div>
                <Label className="text-gray-700">End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border-gray-200"
                />
              </div>
              <div>
                <Label className="text-gray-700">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700">Sales Rep</Label>
                <Select value={repFilter} onValueChange={setRepFilter}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue placeholder="All Reps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reps</SelectItem>
                    {team?.filter(m => m.role === "sales_rep").map(rep => (
                      <SelectItem key={rep.id} value={rep.name || rep.email || ''}>
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
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              Lead Data ({leads?.length || 0} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Sales Rep</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads?.map(lead => (
                    <TableRow key={lead.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{lead.fullName}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell>{lead.salesRepCode || "Direct"}</TableCell>
                      <TableCell>${(lead.amountPaid / 100).toFixed(2)}</TableCell>
                      <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!leads || leads.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
