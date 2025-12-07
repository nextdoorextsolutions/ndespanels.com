import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Search, Phone, Mail, MapPin, Clock, FileText, ChevronRight, Upload, File, Image, Trash2, Download, Plus, Filter, Shield, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "appointment_set", label: "Appointment Set", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "prospect", label: "Prospect", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "approved", label: "Approved", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "project_scheduled", label: "Project Scheduled", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  { value: "completed", label: "Completed", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  { value: "invoiced", label: "Invoiced", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { value: "lien_legal", label: "Lien Legal", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "closed_deal", label: "Closed Deal", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "closed_lost", label: "Closed Lost", color: "bg-red-600/20 text-red-300 border-red-600/30" },
];

export default function CRMLeads() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewJobDialog, setShowNewJobDialog] = useState(false);
  const [newJobForm, setNewJobForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    cityStateZip: "",
    roofAge: "",
    roofConcerns: "",
    dealType: "cash" as "insurance" | "cash" | "financed",
  });
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: permissions } = trpc.crm.getMyPermissions.useQuery();
  const { data: leads, isLoading, refetch } = trpc.crm.getLeads.useQuery({});
  const { data: leadDetail, refetch: refetchLead } = trpc.crm.getLead.useQuery(
    { id: selectedLead! },
    { enabled: !!selectedLead }
  );
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Lead updated successfully");
      refetch();
      refetchLead();
    },
  });
  const addNote = trpc.crm.addNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNoteText("");
      refetchLead();
    },
  });
  const uploadDocument = trpc.crm.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      refetchLead();
      setUploading(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setUploading(false);
    },
  });
  const deleteDocument = trpc.crm.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      refetchLead();
    },
  });
  const createJob = trpc.crm.createJob.useMutation({
    onSuccess: () => {
      toast.success("Job created successfully");
      setShowNewJobDialog(false);
      setNewJobForm({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        cityStateZip: "",
        roofAge: "",
        roofConcerns: "",
        dealType: "cash",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateJob = () => {
    if (!newJobForm.fullName || !newJobForm.email || !newJobForm.phone || !newJobForm.address || !newJobForm.cityStateZip) {
      toast.error("Please fill in all required fields");
      return;
    }
    createJob.mutate(newJobForm);
  };

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch = search === "" || 
      lead.fullName.toLowerCase().includes(search.toLowerCase()) ||
      lead.address.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-slate-600/50 text-slate-300";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;

    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDocument.mutate({
        leadId: selectedLead,
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
        category: "other",
      });
    };
    reader.readAsDataURL(file);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  if (isLoading) {
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Jobs / Contacts</h1>
              {permissions && (
                <span className={`px-2 py-1 rounded text-xs font-medium text-white ${
                  permissions.role === "owner" ? "bg-purple-500" :
                  permissions.role === "admin" ? "bg-blue-500" :
                  permissions.role === "team_lead" ? "bg-green-500" :
                  "bg-cyan-500"
                }`}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  {permissions.roleDisplayName}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {filteredLeads?.length || 0} {permissions?.role === "sales_rep" ? "assigned" : "total"} records
              {permissions?.role === "team_lead" && " (your team)"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-slate-800 border-slate-600 text-white">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white hover:bg-slate-700">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value} className="text-white hover:bg-slate-700">{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
              onClick={() => setShowNewJobDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </div>
        </div>

        {/* Leads Table */}
        <Card className="shadow-sm bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Customer</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Property</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Source</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads?.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className="border-b border-slate-700 hover:bg-slate-700/50 transition cursor-pointer"
                      onClick={() => setLocation(`/crm/job/${lead.id}`)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-white">{lead.fullName}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {lead.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-1 text-slate-300">
                          <MapPin className="w-4 h-4 mt-0.5 text-slate-500" />
                          <div>
                            <p>{lead.address}</p>
                            <p className="text-sm text-slate-400">{lead.cityStateZip}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                          {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="text-slate-300">{lead.promoCode || "Direct"}</p>
                          {lead.salesRepCode && (
                            <p className="text-xs text-[#00d4aa] font-medium">Rep: {lead.salesRepCode}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/crm/job/${lead.id}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10 bg-transparent"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Open
                            </Button>
                          </Link>
<Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLead(lead.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!filteredLeads || filteredLeads.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No leads found. They'll appear here when customers submit requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* New Job Dialog */}
        <Dialog open={showNewJobDialog} onOpenChange={setShowNewJobDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Create New Job</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Full Name *</label>
                <Input
                  value={newJobForm.fullName}
                  onChange={(e) => setNewJobForm({ ...newJobForm, fullName: e.target.value })}
                  placeholder="Customer name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Email *</label>
                <Input
                  type="email"
                  value={newJobForm.email}
                  onChange={(e) => setNewJobForm({ ...newJobForm, email: e.target.value })}
                  placeholder="customer@email.com"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Phone *</label>
                <Input
                  value={newJobForm.phone}
                  onChange={(e) => setNewJobForm({ ...newJobForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Deal Type</label>
                <Select value={newJobForm.dealType} onValueChange={(v: "insurance" | "cash" | "financed") => setNewJobForm({ ...newJobForm, dealType: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="cash" className="text-white">Cash</SelectItem>
                    <SelectItem value="insurance" className="text-white">Insurance</SelectItem>
                    <SelectItem value="financed" className="text-white">Financed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm text-slate-300">Address *</label>
                <Input
                  value={newJobForm.address}
                  onChange={(e) => setNewJobForm({ ...newJobForm, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm text-slate-300">City, State, ZIP *</label>
                <Input
                  value={newJobForm.cityStateZip}
                  onChange={(e) => setNewJobForm({ ...newJobForm, cityStateZip: e.target.value })}
                  placeholder="Houston, TX 77001"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Roof Age</label>
                <Input
                  value={newJobForm.roofAge}
                  onChange={(e) => setNewJobForm({ ...newJobForm, roofAge: e.target.value })}
                  placeholder="e.g., 15 years"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Roof Concerns</label>
                <Input
                  value={newJobForm.roofConcerns}
                  onChange={(e) => setNewJobForm({ ...newJobForm, roofConcerns: e.target.value })}
                  placeholder="e.g., Leaking, storm damage"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <Button variant="outline" onClick={() => setShowNewJobDialog(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateJob}
                disabled={createJob.isPending}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
              >
                {createJob.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </CRMLayout>
  );
}
