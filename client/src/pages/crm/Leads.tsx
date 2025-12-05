import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Search, Phone, Mail, MapPin, Clock, FileText, ChevronRight, Upload, File, Image, Trash2, Download, Plus, Filter } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const STATUS_OPTIONS = [
  { value: "new_lead", label: "New Lead", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "appointment_set", label: "Appointment Set", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "inspection_scheduled", label: "Inspection Scheduled", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "inspection_complete", label: "Inspection Complete", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "report_sent", label: "Report Sent", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "follow_up", label: "Follow Up", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "closed_won", label: "Closed Won", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "closed_lost", label: "Closed Lost", color: "bg-red-100 text-red-700 border-red-200" },
];

export default function CRMLeads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    return STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-gray-100 text-gray-700";
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
    if (fileType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jobs / Contacts</h1>
            <p className="text-sm text-gray-500">{filteredLeads?.length || 0} total records</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64 bg-white border-gray-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-white border-gray-200">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </div>
        </div>

        {/* Leads Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Customer</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Property</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Source</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads?.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{lead.fullName}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-sm text-gray-500">
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
                        <div className="flex items-start gap-1 text-gray-700">
                          <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                          <div>
                            <p>{lead.address}</p>
                            <p className="text-sm text-gray-500">{lead.cityStateZip}</p>
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
                          <p className="text-gray-700">{lead.promoCode || "Direct"}</p>
                          {lead.salesRepCode && (
                            <p className="text-xs text-[#00d4aa] font-medium">Rep: {lead.salesRepCode}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10"
                              onClick={() => setSelectedLead(lead.id)}
                            >
                              View <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-xl text-gray-900">{leadDetail?.fullName || lead.fullName}</DialogTitle>
                            </DialogHeader>
                            {leadDetail && (
                              <Tabs defaultValue="details">
                                <TabsList className="bg-gray-100">
                                  <TabsTrigger value="details">Details</TabsTrigger>
                                  <TabsTrigger value="documents">Documents ({leadDetail.documents?.length || 0})</TabsTrigger>
                                  <TabsTrigger value="activity">Activity</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="space-y-6 mt-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-500 mb-1">Email</p>
                                      <p className="text-gray-900">{leadDetail.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500 mb-1">Phone</p>
                                      <a href={`tel:${leadDetail.phone}`} className="text-[#00d4aa] hover:underline">{leadDetail.phone}</a>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-sm text-gray-500 mb-1">Address</p>
                                      <p className="text-gray-900">{leadDetail.address}, {leadDetail.cityStateZip}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500 mb-1">Roof Age</p>
                                      <p className="text-gray-900">{leadDetail.roofAge || "Not specified"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500 mb-1">Payment</p>
                                      <p className="text-gray-900">${(leadDetail.amountPaid / 100).toFixed(2)}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-500 mb-2">Update Status</p>
                                    <Select 
                                      value={leadDetail.status} 
                                      onValueChange={(value) => updateLead.mutate({ id: leadDetail.id, status: value })}
                                    >
                                      <SelectTrigger className="bg-white border-gray-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {STATUS_OPTIONS.map((status) => (
                                          <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {leadDetail.roofConcerns && (
                                    <div>
                                      <p className="text-sm text-gray-500 mb-1">Roof Concerns</p>
                                      <p className="text-gray-900 bg-gray-50 p-3 rounded border">{leadDetail.roofConcerns}</p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      leadDetail.handsOnInspection ? "bg-[#00d4aa]/20 text-[#00d4aa]" : "bg-gray-100 text-gray-500"
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
                                      className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {uploading ? "Uploading..." : "Upload Document"}
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-2">
                                      Supported: Images, PDFs, Word documents
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    {leadDetail.documents?.map((doc: any) => (
                                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                                        <div className="flex items-center gap-3">
                                          {getFileIcon(doc.fileType)}
                                          <div>
                                            <p className="text-sm text-gray-900">{doc.fileName}</p>
                                            <p className="text-xs text-gray-500">
                                              {new Date(doc.createdAt).toLocaleDateString()} • {doc.uploadedBy?.name || "System"}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="ghost" size="sm">
                                              <Download className="w-4 h-4" />
                                            </Button>
                                          </a>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => deleteDocument.mutate({ documentId: doc.id })}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    {(!leadDetail.documents || leadDetail.documents.length === 0) && (
                                      <p className="text-center text-gray-500 py-8">No documents uploaded yet</p>
                                    )}
                                  </div>
                                </TabsContent>

                                <TabsContent value="activity" className="mt-4">
                                  <div className="mb-4">
                                    <Textarea
                                      placeholder="Add a note..."
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      className="bg-white border-gray-200"
                                    />
                                    <Button 
                                      onClick={() => {
                                        if (noteText.trim()) {
                                          addNote.mutate({ leadId: selectedLead!, note: noteText });
                                        }
                                      }}
                                      disabled={!noteText.trim()}
                                      className="mt-2 bg-[#00d4aa] hover:bg-[#00b894] text-black"
                                    >
                                      Add Note
                                    </Button>
                                  </div>

                                  <div className="space-y-3">
                                    {leadDetail.activities?.map((activity: any) => (
                                      <div key={activity.id} className="flex gap-3 p-3 bg-gray-50 rounded border">
                                        <div className="w-8 h-8 rounded-full bg-[#00d4aa]/20 flex items-center justify-center flex-shrink-0">
                                          <FileText className="w-4 h-4 text-[#00d4aa]" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-900">{activity.description}</p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {activity.user?.name || "System"} • {new Date(activity.createdAt).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {(!leadDetail.activities || leadDetail.activities.length === 0) && (
                                      <p className="text-center text-gray-500 py-8">No activity yet</p>
                                    )}
                                  </div>
                                </TabsContent>
                              </Tabs>
                            )}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                  {(!filteredLeads || filteredLeads.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
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
