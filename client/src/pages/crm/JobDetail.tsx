import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  Image,
  MessageSquare,
  History,
  Search,
  Upload,
  Download,
  Trash2,
  Send,
  Edit2,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  new_lead: { label: "New Lead", color: "bg-orange-500", icon: AlertCircle },
  contacted: { label: "Contacted", color: "bg-yellow-500", icon: Phone },
  appointment_set: { label: "Appointment Set", color: "bg-blue-500", icon: Calendar },
  inspection_scheduled: { label: "Inspection Scheduled", color: "bg-blue-600", icon: Calendar },
  inspection_complete: { label: "Inspection Complete", color: "bg-purple-500", icon: CheckCircle },
  report_sent: { label: "Report Sent", color: "bg-teal-500", icon: FileText },
  follow_up: { label: "Follow Up", color: "bg-yellow-600", icon: Phone },
  closed_won: { label: "Closed Won", color: "bg-green-500", icon: CheckCircle },
  closed_lost: { label: "Closed Lost", color: "bg-red-500", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-500", icon: XCircle },
};

// Activity type icons
const ACTIVITY_ICONS: Record<string, typeof CheckCircle> = {
  status_change: CheckCircle,
  note_added: FileText,
  call_logged: Phone,
  email_sent: Mail,
  sms_sent: MessageSquare,
  appointment_scheduled: Calendar,
  document_uploaded: FileText,
  payment_received: CheckCircle,
  assigned: User,
  created: AlertCircle,
  message: MessageSquare,
  photo_uploaded: Image,
};

// Tab configuration
const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "photos", label: "Photos", icon: Image },
  { key: "messages", label: "Notes & Messages", icon: MessageSquare },
  { key: "timeline", label: "Timeline", icon: History },
];

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = parseInt(params.id || "0");
  
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: jobData, isLoading, refetch } = trpc.crm.getJobDetail.useQuery(
    { id: jobId },
    { enabled: jobId > 0 }
  );
  const { data: searchResults } = trpc.crm.searchJob.useQuery(
    { jobId, query: searchQuery, type: "all" },
    { enabled: searchQuery.length > 2 }
  );
  const { data: team } = trpc.crm.getTeam.useQuery();

  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Job updated successfully");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const addMessage = trpc.crm.addMessage.useMutation({
    onSuccess: () => {
      toast.success("Message added");
      setNewMessage("");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadDocument = trpc.crm.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded");
      setIsUploading(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUploading(false);
    },
  });

  const uploadPhoto = trpc.crm.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded");
      setIsUploading(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUploading(false);
    },
  });

  const deleteDocument = trpc.crm.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "photo") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      
      if (type === "photo") {
        await uploadPhoto.mutateAsync({
          jobId,
          fileName: file.name,
          fileData: base64,
          fileType: file.type,
          category: "inspection_photo",
        });
      } else {
        await uploadDocument.mutateAsync({
          leadId: jobId,
          fileName: file.name,
          fileData: base64,
          fileType: file.type,
          category: file.type.includes("pdf") ? "report" : "other",
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    addMessage.mutate({
      jobId,
      message: newMessage,
      isInternal: true,
    });
  };

  if (isLoading || !jobData) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96 bg-slate-900">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  const { job, assignedUser, documents, photos, messages, timeline } = jobData;
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.new_lead;

  // Filter content based on search
  const filteredDocuments = searchQuery 
    ? documents.filter(d => d.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;
  const filteredPhotos = searchQuery
    ? photos.filter(p => p.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
    : photos;
  const filteredMessages = searchQuery
    ? messages.filter(m => m.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;
  const filteredTimeline = searchQuery
    ? timeline.filter(t => t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : timeline;

  return (
    <CRMLayout>
      <div className="bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/crm/leads">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Jobs
                </Button>
              </Link>
              <div className="h-8 w-px bg-slate-600" />
              <div>
                <h1 className="text-xl font-bold text-white">{job.fullName}</h1>
                <p className="text-sm text-slate-400">{job.address}, {job.cityStateZip}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <Select
                value={job.status}
                onValueChange={(value) => updateLead.mutate({ id: jobId, status: value })}
              >
                <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-slate-600">
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800 border-b border-slate-700 px-6">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#00d4aa] text-[#00d4aa]"
                    : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.key === "documents" && documents.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-slate-600 rounded text-xs">{documents.length}</span>
                )}
                {tab.key === "photos" && photos.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-slate-600 rounded text-xs">{photos.length}</span>
                )}
                {tab.key === "messages" && messages.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-slate-600 rounded text-xs">{messages.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar (for Documents, Photos, Messages, Timeline tabs) */}
        {activeTab !== "overview" && (
          <div className="px-6 py-4 bg-slate-850">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Info */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-[#00d4aa]" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center">
                      <span className="text-black font-bold text-lg">
                        {job.fullName?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{job.fullName}</p>
                      <p className="text-sm text-slate-400">Customer</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-3 text-slate-300">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${job.phone}`} className="hover:text-[#00d4aa]">{job.phone}</a>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${job.email}`} className="hover:text-[#00d4aa]">{job.email}</a>
                    </div>
                    <div className="flex items-start gap-3 text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p>{job.address}</p>
                        <p>{job.cityStateZip}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Job Details */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Job Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <p className="font-medium text-white">{statusConfig.label}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Priority</p>
                      <p className="font-medium text-white capitalize">{job.priority}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Roof Age</p>
                      <p className="font-medium text-white">{job.roofAge || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Hands-On Inspection</p>
                      <p className="font-medium text-white">{job.handsOnInspection ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Lead Source</p>
                      <p className="font-medium text-white capitalize">{job.leadSource || "Website"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Amount Paid</p>
                      <p className="font-medium text-white">${((job.amountPaid || 0) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  {job.roofConcerns && (
                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-sm text-slate-400 mb-2">Roof Concerns</p>
                      <p className="text-slate-300">{job.roofConcerns}</p>
                    </div>
                  )}
                  {job.scheduledDate && (
                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-sm text-slate-400 mb-2">Scheduled Date</p>
                      <p className="text-white font-medium">
                        {new Date(job.scheduledDate).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment & Notes */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    Assignment & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Assigned To</p>
                    <Select
                      value={job.assignedTo?.toString() || "unassigned"}
                      onValueChange={(value) => updateLead.mutate({ 
                        id: jobId, 
                        assignedTo: value === "unassigned" ? undefined : parseInt(value) 
                      })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="unassigned" className="text-white hover:bg-slate-600">
                          Unassigned
                        </SelectItem>
                        {team?.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()} className="text-white hover:bg-slate-600">
                            {member.name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Internal Notes</p>
                    <Textarea
                      placeholder="Add internal notes..."
                      value={job.internalNotes || ""}
                      onChange={(e) => updateLead.mutate({ id: jobId, internalNotes: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 min-h-[120px]"
                    />
                  </div>
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">Created</p>
                    <p className="text-slate-300">{new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Documents ({filteredDocuments.length})</h2>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e, "document")}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </div>
              
              {filteredDocuments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => (
                    <Card key={doc.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{doc.fileName}</p>
                            <p className="text-sm text-slate-400">
                              {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "Unknown size"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              onClick={() => deleteDocument.mutate({ documentId: doc.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                    <p className="text-slate-400">No documents uploaded yet</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-[#00d4aa]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload your first document
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === "photos" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Photos ({filteredPhotos.length})</h2>
                <div>
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={(e) => handleFileUpload(e, "photo")}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button 
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                </div>
              </div>
              
              {filteredPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPhotos.map((photo) => (
                    <Card key={photo.id} className="bg-slate-800 border-slate-700 overflow-hidden group">
                      <div className="aspect-square relative">
                        <img 
                          src={photo.fileUrl} 
                          alt={photo.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            onClick={() => deleteDocument.mutate({ documentId: photo.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm text-white truncate">{photo.fileName}</p>
                        <p className="text-xs text-slate-400">{new Date(photo.createdAt).toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <Image className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                    <p className="text-slate-400">No photos uploaded yet</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-[#00d4aa]"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      Upload your first photo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Notes & Messages ({filteredMessages.length})</h2>
              </div>

              {/* New Message Input */}
              <Card className="bg-slate-800 border-slate-700 mb-6">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Add a note or message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 min-h-[80px] flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || addMessage.isPending}
                      className="bg-[#00d4aa] hover:bg-[#00b894] text-black self-end"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Messages List */}
              {filteredMessages.length > 0 ? (
                <div className="space-y-4">
                  {filteredMessages.map((msg) => (
                    <Card key={msg.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center flex-shrink-0">
                            <span className="text-black font-semibold text-sm">
                              {msg.user?.name?.charAt(0) || msg.user?.email?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-white">{msg.user?.name || msg.user?.email || "System"}</p>
                              <span className="text-xs text-slate-500">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-300 whitespace-pre-wrap">{msg.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                    <p className="text-slate-400">No messages yet</p>
                    <p className="text-sm text-slate-500 mt-1">Start the conversation by adding a note above</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Activity Timeline ({filteredTimeline.length})</h2>
              </div>

              {filteredTimeline.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700" />
                  
                  <div className="space-y-6">
                    {filteredTimeline.map((activity, index) => {
                      const Icon = ACTIVITY_ICONS[activity.activityType] || Clock;
                      return (
                        <div key={activity.id} className="relative flex gap-4">
                          {/* Timeline dot */}
                          <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center z-10">
                            <Icon className="w-4 h-4 text-[#00d4aa]" />
                          </div>
                          
                          {/* Content */}
                          <Card className="flex-1 bg-slate-800 border-slate-700">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-white">{activity.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {activity.user && (
                                      <span className="text-sm text-slate-400">
                                        by {activity.user.name || activity.user.email}
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-500">
                                      {new Date(activity.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 capitalize">
                                  {activity.activityType.replace("_", " ")}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <History className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                    <p className="text-slate-400">No activity recorded yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
