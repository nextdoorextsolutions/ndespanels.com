import { useState, useRef, useEffect } from "react";
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
  Save,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Shield,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

// Status configuration - Updated for new pipeline
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  lead: { label: "Lead", color: "bg-orange-500", icon: AlertCircle },
  appointment_set: { label: "Appointment Set", color: "bg-yellow-500", icon: Calendar },
  prospect: { label: "Prospect", color: "bg-blue-500", icon: User },
  approved: { label: "Approved", color: "bg-purple-500", icon: CheckCircle },
  project_scheduled: { label: "Project Scheduled", color: "bg-indigo-500", icon: Calendar },
  completed: { label: "Completed", color: "bg-teal-500", icon: CheckCircle },
  invoiced: { label: "Invoiced", color: "bg-cyan-500", icon: FileText },
  lien_legal: { label: "Lien Legal", color: "bg-red-500", icon: AlertCircle },
  closed_deal: { label: "Closed Deal", color: "bg-green-500", icon: CheckCircle },
  closed_lost: { label: "Closed Lost", color: "bg-red-500", icon: XCircle },
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

// Edit type colors for history
const EDIT_TYPE_COLORS: Record<string, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  assign: "bg-purple-500",
  status_change: "bg-yellow-500",
};

// Tab configuration
const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "photos", label: "Photos", icon: Image },
  { key: "messages", label: "Notes & Messages", icon: MessageSquare },
  { key: "timeline", label: "Timeline", icon: History },
  { key: "edit_history", label: "Edit History", icon: Eye, requiresPermission: "canViewHistory" },
];

// Customer Status Editor - Only updates on Enter key
function CustomerStatusEditor({ 
  jobId, 
  initialMessage, 
  canEdit, 
  onUpdate 
}: { 
  jobId: number; 
  initialMessage: string; 
  canEdit: boolean; 
  onUpdate: () => void;
}) {
  const [message, setMessage] = useState(initialMessage);
  const [hasChanges, setHasChanges] = useState(false);
  
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Customer status message updated");
      setHasChanges(false);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    updateLead.mutate({ id: jobId, customerStatusMessage: message });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  // Update local state when initialMessage changes (e.g., after refetch)
  useEffect(() => {
    setMessage(initialMessage);
    setHasChanges(false);
  }, [initialMessage]);

  return (
    <Card className="bg-slate-800 border-slate-700 lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-cyan-400" />
          Customer Portal Status
          <span className="text-xs font-normal text-slate-400 ml-2">
            (This message is shown to customers in the portal)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {canEdit ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Enter a status message for the customer to see in their portal... (e.g., 'Your inspection is scheduled for Monday. Our team will arrive between 9am-12pm.')" 
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setHasChanges(e.target.value !== initialMessage);
              }}
              onKeyDown={handleKeyDown}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Press <kbd className="px-1.5 py-0.5 bg-slate-600 rounded text-slate-300">Enter</kbd> to save, or use the button. Customers can view at: <span className="text-cyan-400">/portal</span>
              </p>
              {hasChanges && (
                <Button 
                  onClick={handleSave}
                  disabled={updateLead.isPending}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {updateLead.isPending ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {initialMessage ? (
              <p className="text-slate-300 whitespace-pre-wrap">{initialMessage}</p>
            ) : (
              <p className="text-slate-500 italic">No customer status message set</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = parseInt(params.id || "0");
  
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    cityStateZip: "",
    roofAge: "",
    roofConcerns: "",
    leadSource: "",
    handsOnInspection: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: jobData, isLoading, refetch } = trpc.crm.getJobDetail.useQuery(
    { id: jobId },
    { enabled: jobId > 0 }
  );
  const { data: permissions } = trpc.crm.getMyPermissions.useQuery();
  const { data: searchResults } = trpc.crm.searchJob.useQuery(
    { jobId, query: searchQuery, type: "all" },
    { enabled: searchQuery.length > 2 }
  );
  const { data: team } = trpc.crm.getTeam.useQuery();
  const { data: editHistoryData } = trpc.crm.getEditHistory.useQuery(
    { jobId, limit: 100 },
    { enabled: jobId > 0 && permissions?.canViewEditHistory }
  );

  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Job updated successfully");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCustomerInfo = trpc.crm.updateCustomerInfo.useMutation({
    onSuccess: () => {
      toast.success("Customer info updated successfully");
      setIsEditingCustomer(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteLead = trpc.crm.deleteLead.useMutation({
    onSuccess: () => {
      toast.success("Job deleted successfully");
      window.location.href = "/crm/leads";
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

  const startEditingCustomer = () => {
    if (!jobData?.job) return;
    setCustomerForm({
      fullName: jobData.job.fullName || "",
      email: jobData.job.email || "",
      phone: jobData.job.phone || "",
      address: jobData.job.address || "",
      cityStateZip: jobData.job.cityStateZip || "",
      roofAge: jobData.job.roofAge || "",
      roofConcerns: jobData.job.roofConcerns || "",
      leadSource: jobData.job.leadSource || "",
      handsOnInspection: jobData.job.handsOnInspection || false,
    });
    setIsEditingCustomer(true);
  };

  const saveCustomerInfo = () => {
    updateCustomerInfo.mutate({
      id: jobId,
      ...customerForm,
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

  const { job, assignedUser, documents, photos, messages, timeline, permissions: jobPermissions } = jobData;
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.new_lead;
  const canEdit = jobPermissions?.canEdit ?? false;
  const canDelete = jobPermissions?.canDelete ?? false;
  const canViewHistory = jobPermissions?.canViewHistory ?? false;

  // Filter tabs based on permissions
  const visibleTabs = TABS.filter(tab => {
    if (tab.requiresPermission === "canViewHistory") {
      return canViewHistory;
    }
    return true;
  });

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
  const filteredEditHistory = searchQuery && editHistoryData
    ? editHistoryData.filter(h => 
        h.fieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.oldValue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.newValue?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : editHistoryData || [];

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
              {/* Role Badge */}
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              {canEdit && (
                <Select
                  value={job.status}
                  onValueChange={(value) => updateLead.mutate({ id: jobId, status: value as any })}
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
              )}
              {canDelete && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
                      deleteLead.mutate({ id: jobId });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800 border-b border-slate-700 px-6">
          <div className="flex items-center gap-1">
            {visibleTabs.map((tab) => (
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
                {tab.key === "edit_history" && editHistoryData && editHistoryData.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-slate-600 rounded text-xs">{editHistoryData.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar (for Documents, Photos, Messages, Timeline, Edit History tabs) */}
        {activeTab !== "overview" && (
          <div className="px-6 py-4 bg-slate-850">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={`Search ${activeTab.replace("_", " ")}...`}
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
              {/* Customer Info - Editable */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-[#00d4aa]" />
                      Customer Information
                    </CardTitle>
                    {canEdit && !isEditingCustomer && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={startEditingCustomer}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isEditingCustomer && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                          onClick={saveCustomerInfo}
                          disabled={updateCustomerInfo.isPending}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => setIsEditingCustomer(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditingCustomer ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-400">Full Name</label>
                        <Input
                          value={customerForm.fullName}
                          onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Email</label>
                        <Input
                          type="email"
                          value={customerForm.email}
                          onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Phone</label>
                        <Input
                          value={customerForm.phone}
                          onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Address</label>
                        <Input
                          value={customerForm.address}
                          onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">City, State, ZIP</label>
                        <Input
                          value={customerForm.cityStateZip}
                          onChange={(e) => setCustomerForm({ ...customerForm, cityStateZip: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Lead Source</label>
                        <Select
                          value={customerForm.leadSource || "website"}
                          onValueChange={(value) => setCustomerForm({ ...customerForm, leadSource: value })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="website" className="text-white hover:bg-slate-600">Website</SelectItem>
                            <SelectItem value="referral" className="text-white hover:bg-slate-600">Referral</SelectItem>
                            <SelectItem value="door_hanger" className="text-white hover:bg-slate-600">Door Hanger</SelectItem>
                            <SelectItem value="cold_call" className="text-white hover:bg-slate-600">Cold Call</SelectItem>
                            <SelectItem value="social_media" className="text-white hover:bg-slate-600">Social Media</SelectItem>
                            <SelectItem value="other" className="text-white hover:bg-slate-600">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
                      {canEdit ? (
                        <Select
                          value={job.priority}
                          onValueChange={(value) => updateLead.mutate({ id: jobId, priority: value })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="low" className="text-white hover:bg-slate-600">Low</SelectItem>
                            <SelectItem value="medium" className="text-white hover:bg-slate-600">Medium</SelectItem>
                            <SelectItem value="high" className="text-white hover:bg-slate-600">High</SelectItem>
                            <SelectItem value="urgent" className="text-white hover:bg-slate-600">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium text-white capitalize">{job.priority}</p>
                      )}
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

              {/* Customer Portal Status Message */}
              <CustomerStatusEditor 
                jobId={jobId}
                initialMessage={job.customerStatusMessage || ""}
                canEdit={canEdit}
                onUpdate={refetch}
              />

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
                    {canEdit ? (
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
                              {member.name || member.email} ({member.roleDisplayName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-white">{assignedUser?.name || assignedUser?.email || "Unassigned"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Internal Notes</p>
                    {canEdit ? (
                      <Textarea
                        placeholder="Add internal notes..."
                        value={job.internalNotes || ""}
                        onChange={(e) => updateLead.mutate({ id: jobId, internalNotes: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 min-h-[120px]"
                      />
                    ) : (
                      <p className="text-slate-300">{job.internalNotes || "No notes"}</p>
                    )}
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
                {canEdit && (
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
                )}
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
                            {canDelete && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                onClick={() => deleteDocument.mutate({ documentId: doc.id })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
                    {canEdit && (
                      <Button 
                        variant="link" 
                        className="mt-2 text-[#00d4aa]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload your first document
                      </Button>
                    )}
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
                {canEdit && (
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
                )}
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
                          {canDelete && (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                              onClick={() => deleteDocument.mutate({ documentId: photo.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
                    {canEdit && (
                      <Button 
                        variant="link" 
                        className="mt-2 text-[#00d4aa]"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        Upload your first photo
                      </Button>
                    )}
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
              {canEdit && (
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
              )}

              {/* Messages List */}
              {filteredMessages.length > 0 ? (
                <div className="space-y-4">
                  {filteredMessages.map((msg) => {
                    const isCustomerMessage = msg.activityType === "customer_message";
                    const isCallbackRequest = msg.activityType === "callback_requested";
                    const isFromCustomer = isCustomerMessage || isCallbackRequest;
                    
                    return (
                      <Card 
                        key={msg.id} 
                        className={`border ${isFromCustomer ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isFromCustomer 
                                ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                                : 'bg-gradient-to-br from-[#00d4aa] to-[#00b894]'
                            }`}>
                              <span className={`font-semibold text-sm ${isFromCustomer ? 'text-white' : 'text-black'}`}>
                                {isFromCustomer ? 'C' : (msg.user?.name?.charAt(0) || msg.user?.email?.charAt(0) || "?")}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-medium text-white">
                                  {isFromCustomer ? 'Customer' : (msg.user?.name || msg.user?.email || "System")}
                                </p>
                                {isFromCustomer && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    isCallbackRequest 
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {isCallbackRequest ? '📞 Callback Requested' : '💬 Customer Message'}
                                  </span>
                                )}
                                <span className="text-xs text-slate-500">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-300 whitespace-pre-wrap">{msg.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                    <p className="text-slate-400">No messages yet</p>
                    {canEdit && (
                      <p className="text-sm text-slate-500 mt-1">Start the conversation by adding a note above</p>
                    )}
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

          {/* Edit History Tab (Owner/Admin only) */}
          {activeTab === "edit_history" && canViewHistory && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Edit History ({filteredEditHistory.length})
                </h2>
                <span className="text-sm text-slate-400">Audit trail for compliance and accountability</span>
              </div>

              {filteredEditHistory.length > 0 ? (
                <div className="space-y-3">
                  {filteredEditHistory.map((edit) => (
                    <Card key={edit.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-2 h-2 rounded-full mt-2 ${EDIT_TYPE_COLORS[edit.editType] || "bg-gray-500"}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-white capitalize">{edit.fieldName.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className={`px-2 py-0.5 rounded text-xs text-white ${EDIT_TYPE_COLORS[edit.editType] || "bg-gray-500"}`}>
                                {edit.editType.replace("_", " ")}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-slate-400 mb-1">Previous Value</p>
                                <p className="text-slate-300 bg-slate-700/50 px-2 py-1 rounded font-mono text-xs">
                                  {edit.oldValue || "(empty)"}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400 mb-1">New Value</p>
                                <p className="text-slate-300 bg-slate-700/50 px-2 py-1 rounded font-mono text-xs">
                                  {edit.newValue || "(empty)"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                              <span>
                                Changed by: <span className="text-slate-400">{edit.user?.name || edit.user?.email || "Unknown"}</span>
                              </span>
                              <span>{new Date(edit.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                    <p className="text-slate-400">No edit history recorded yet</p>
                    <p className="text-sm text-slate-500 mt-1">Changes to this job will be tracked here</p>
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
