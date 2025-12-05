import { useState, useRef } from "react";
import { Link } from "wouter";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
            <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
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
                    <tr key={lead.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-slate-400 hover:text-white hover:bg-slate-700"
                                onClick={() => setSelectedLead(lead.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-xl text-white">{leadDetail?.fullName || lead.fullName}</DialogTitle>
                            </DialogHeader>
                            {leadDetail && (
                              <Tabs defaultValue="details">
                                <TabsList className="bg-slate-700">
                                  <TabsTrigger value="details" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">Details</TabsTrigger>
                                  <TabsTrigger value="documents" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">Documents ({leadDetail.documents?.length || 0})</TabsTrigger>
                                  <TabsTrigger value="activity" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">Activity</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="space-y-6 mt-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-slate-400 mb-1">Email</p>
                                      <p className="text-white">{leadDetail.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-400 mb-1">Phone</p>
                                      <a href={`tel:${leadDetail.phone}`} className="text-[#00d4aa] hover:underline">{leadDetail.phone}</a>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-sm text-slate-400 mb-1">Address</p>
                                      <p className="text-white">{leadDetail.address}, {leadDetail.cityStateZip}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-400 mb-1">Roof Age</p>
                                      <p className="text-white">{leadDetail.roofAge || "Not specified"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-400 mb-1">Payment</p>
                                      <p className="text-white">${(leadDetail.amountPaid / 100).toFixed(2)}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-sm text-slate-400 mb-2">Update Status</p>
                                    <Select 
                                      value={leadDetail.status} 
                                      onValueChange={(value) => updateLead.mutate({ id: leadDetail.id, status: value as any })}
                                    >
                                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-700 border-slate-600">
                                        {STATUS_OPTIONS.map((status) => (
                                          <SelectItem key={status.value} value={status.value} className="text-white hover:bg-slate-600">{status.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {leadDetail.roofConcerns && (
                                    <div>
                                      <p className="text-sm text-slate-400 mb-1">Roof Concerns</p>
                                      <p className="text-white bg-slate-700 p-3 rounded border border-slate-600">{leadDetail.roofConcerns}</p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      leadDetail.handsOnInspection ? "bg-[#00d4aa]/20 text-[#00d4aa]" : "bg-slate-700 text-slate-400"
                                    }`}>
                                      {leadDetail.handsOnInspection ? "✓ Hands-On Inspection Requested" : "Drone Only"}
                                    </span>
                                  </div>
                                </TabsContent>

                                <TabsContent value="documents" className="mt-4">
                                  <div className="mb-4">
                                    <input
                                      type="file"
                                      ref={fileInputRef}
                                      onChange={handleFileUpload}
                                      className="hidden"
                                      accept="image/*,.pdf,.doc,.docx"
                                    />
                                    <Button 
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={uploading}
                                      className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {uploading ? "Uploading..." : "Upload Document"}
                                    </Button>
                                    <p className="text-xs text-slate-400 mt-2">
                                      Supported: Images, PDFs, Word documents
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    {leadDetail.documents?.map((doc: any) => (
                                      <div key={doc.id} className="flex items-center justify-between bg-slate-700 p-3 rounded border border-slate-600">
                                        <div className="flex items-center gap-3">
                                          {getFileIcon(doc.fileType)}
                                          <div>
                                            <p className="text-sm text-white">{doc.fileName}</p>
                                            <p className="text-xs text-slate-400">
                                              {new Date(doc.createdAt).toLocaleDateString()} • {doc.uploadedBy?.name || "System"}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-600">
                                              <Download className="w-4 h-4" />
                                            </Button>
                                          </a>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-400 hover:text-red-300 hover:bg-slate-600"
                                            onClick={() => deleteDocument.mutate({ documentId: doc.id })}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    {(!leadDetail.documents || leadDetail.documents.length === 0) && (
                                      <p className="text-center text-slate-400 py-8">No documents uploaded yet</p>
                                    )}
                                  </div>
                                </TabsContent>

                                <TabsContent value="activity" className="mt-4">
                                  <div className="mb-4">
                                    <Textarea
                                      placeholder="Add a note..."
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                    <Button 
                                      onClick={() => {
                                        if (noteText.trim()) {
                                          addNote.mutate({ leadId: selectedLead!, note: noteText });
                                        }
                                      }}
                                      disabled={!noteText.trim()}
                                      className="mt-2 bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                                    >
                                      Add Note
                                    </Button>
                                  </div>

                                  <div className="space-y-3">
                                    {leadDetail.activities?.map((activity: any) => (
                                      <div key={activity.id} className="flex gap-3 p-3 bg-slate-700 rounded border border-slate-600">
                                        <div className="w-8 h-8 rounded-full bg-[#00d4aa]/20 flex items-center justify-center flex-shrink-0">
                                          <FileText className="w-4 h-4 text-[#00d4aa]" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm text-white">{activity.description}</p>
                                          <p className="text-xs text-slate-400 mt-1">
                                            {activity.user?.name || "System"} • {new Date(activity.createdAt).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {(!leadDetail.activities || leadDetail.activities.length === 0) && (
                                      <p className="text-center text-slate-400 py-8">No activity yet</p>
                                    )}
                                  </div>
                                </TabsContent>
                              </Tabs>
                            )}
                          </DialogContent>
                        </Dialog>
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
      </div>
    </CRMLayout>
  );
}
