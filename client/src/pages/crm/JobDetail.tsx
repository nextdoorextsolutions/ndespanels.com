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
  Copy,
  Link2,
  Truck,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Grid3X3,
  Maximize2,
  Paperclip,
  FileDown,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import { useRealtimeJob } from "@/hooks/useRealtimeJob";
import { JobPipelineTracker } from "@/components/JobPipelineTracker";
import type { Job, JobStatus, DealType, hasSolarData, getRoofAreaSqFt, getRoofAreaSource } from "@/types";
import { InsuranceInfoCard } from "@/components/crm/InsuranceInfoCard";
import { MentionInput } from "@/components/MentionInput";
import { RoofingReportView } from "@/components/RoofingReportView";
import { MaterialEmailDialog } from "@/components/crm/MaterialEmailDialog";
import { ProposalCalculator } from "@/components/crm/ProposalCalculator";
import { GoogleMapsLoader } from "@/components/GoogleMapsLoader";
import { JobProposalTab } from "@/components/crm/job-detail/JobProposalTab";
import { JobProductionTab } from "@/components/crm/job-detail/JobProductionTab";
import { JobDocumentsTab } from "@/components/crm/job-detail/JobDocumentsTab";
import { JobPhotosTab } from "@/components/crm/job-detail/JobPhotosTab";
import { JobMessagesTab } from "@/components/crm/job-detail/JobMessagesTab";
import { JobTimelineTab } from "@/components/crm/job-detail/JobTimelineTab";
import { JobEditHistoryTab } from "@/components/crm/job-detail/JobEditHistoryTab";

// Helper function to format mentions in messages
const formatMentions = (text: string) => {
  // Replace @[userId:userName] with styled mention
  const mentionRegex = /@\[(\d+):([^\]]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add styled mention
    parts.push(
      <span key={match.index} className="text-[#00d4aa] font-semibold">
        @{match[2]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Pipeline stage order for navigation
const PIPELINE_ORDER = [
  "lead",
  "appointment_set",
  "prospect",
  "approved",
  "project_scheduled",
  "completed",
  "invoiced",
  "closed_deal",
];

// Status configuration - Updated for new pipeline
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  lead: { label: "Lead", color: "bg-slate-500", icon: AlertCircle },
  appointment_set: { label: "Appointment Set", color: "bg-cyan-500", icon: Calendar },
  prospect: { label: "Prospect", color: "bg-teal-500", icon: User },
  approved: { label: "Approved", color: "bg-emerald-500", icon: CheckCircle },
  project_scheduled: { label: "Project Scheduled", color: "bg-green-500", icon: Calendar },
  completed: { label: "Completed", color: "bg-green-400", icon: CheckCircle },
  invoiced: { label: "Invoiced", color: "bg-lime-500", icon: FileText },
  lien_legal: { label: "Lien Legal", color: "bg-red-600", icon: AlertCircle },
  closed_deal: { label: "Closed Deal", color: "bg-gradient-to-r from-yellow-500 to-green-500", icon: CheckCircle },
  closed_lost: { label: "Closed Lost", color: "bg-slate-600", icon: XCircle },
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

// Field type icons and colors for audit trail
const FIELD_TYPE_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  status: { icon: CheckCircle, color: "text-green-400", label: "Status Change" },
  note: { icon: FileText, color: "text-blue-400", label: "Note Added" },
  customer_message: { icon: MessageSquare, color: "text-purple-400", label: "Customer Message" },
  document: { icon: FileText, color: "text-orange-400", label: "Document Upload" },
  photo: { icon: Image, color: "text-pink-400", label: "Photo Upload" },
  assigned_to: { icon: User, color: "text-cyan-400", label: "Assignment" },
  full_name: { icon: User, color: "text-slate-400", label: "Customer Info" },
  email: { icon: Mail, color: "text-slate-400", label: "Contact Info" },
  phone: { icon: Phone, color: "text-slate-400", label: "Contact Info" },
  address: { icon: AlertCircle, color: "text-slate-400", label: "Property Info" },
};

// Tab configuration
const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "proposal", label: "Proposal & Contract", icon: Calculator }, // Always visible
  { key: "production_report", label: "Production Report", icon: Grid3X3 },
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

// Internal Notes Editor - Only updates on Enter/Ctrl+Enter or Save button
function InternalNotesEditor({ 
  jobId, 
  initialNotes, 
  canEdit, 
  onUpdate 
}: { 
  jobId: number; 
  initialNotes: string; 
  canEdit: boolean; 
  onUpdate: () => void;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Internal notes updated");
      setHasChanges(false);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = async () => {
    if (!notes.trim() && selectedFiles.length === 0) return;
    
    // Convert files to base64
    const attachments = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
          };
          reader.readAsDataURL(file);
        });
        return {
          fileName: file.name,
          fileData: base64,
          fileType: file.type,
        };
      })
    );
    
    updateLead.mutate(
      { 
        id: jobId, 
        internalNotes: notes || "(File attachment)",
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      {
        onSuccess: () => {
          setNotes("");
          setSelectedFiles([]);
          onUpdate();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Update local state when initialNotes changes
  useEffect(() => {
    setNotes(initialNotes);
    setHasChanges(false);
  }, [initialNotes]);

  if (!canEdit) {
    return <p className="text-slate-300">{initialNotes || "No notes"}</p>;
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Add internal notes..."
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setHasChanges(e.target.value !== initialNotes);
        }}
        onKeyDown={handleKeyDown}
        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 min-h-[120px]"
      />
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-slate-400" />
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
        />
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2">
                <p className="text-xs text-slate-400">{file.name}</p>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Press <kbd className="px-1.5 py-0.5 bg-slate-600 rounded text-slate-300">Ctrl+Enter</kbd> to save
        </p>
        {hasChanges && (
          <Button 
            onClick={handleSave}
            disabled={updateLead.isPending}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {updateLead.isPending ? "Saving..." : "Save Notes"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Scheduled Date Editor - Only updates on blur or Enter
function ScheduledDateEditor({ 
  jobId, 
  initialDate, 
  canEdit, 
  onUpdate 
}: { 
  jobId: number; 
  initialDate: string | null; 
  canEdit: boolean; 
  onUpdate: () => void;
}) {
  const [date, setDate] = useState(initialDate ? new Date(initialDate).toISOString().slice(0, 16) : "");
  const [hasChanges, setHasChanges] = useState(false);
  
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Scheduled date updated");
      setHasChanges(false);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (date) {
      updateLead.mutate({ id: jobId, scheduledDate: new Date(date).toISOString() });
    }
  };

  // Update local state when initialDate changes
  useEffect(() => {
    setDate(initialDate ? new Date(initialDate).toISOString().slice(0, 16) : "");
    setHasChanges(false);
  }, [initialDate]);

  if (!canEdit) {
    return (
      <p className="font-medium text-white">
        {initialDate ? new Date(initialDate).toLocaleString() : "Not scheduled"}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          type="datetime-local"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setHasChanges(e.target.value !== (initialDate ? new Date(initialDate).toISOString().slice(0, 16) : ""));
          }}
          onBlur={handleSave}
          className="bg-slate-700 border-slate-600 text-white h-8 flex-1"
        />
        {hasChanges && (
          <Button 
            onClick={handleSave}
            disabled={updateLead.isPending}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
          >
            {updateLead.isPending ? "..." : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = parseInt(params.id || "0");
  
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string; type: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
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
  const { data: permissions } = trpc.users.getMyPermissions.useQuery();

  // Real-time updates - auto-refresh when other users make changes
  const { broadcast } = useRealtimeJob({
    jobId,
    enabled: jobId > 0,
    onUpdate: (payload) => {
      // Refetch data when another user makes changes
      refetch();
      toast.info(`Job updated: ${payload.updateType}`, {
        description: "Data refreshed automatically",
        duration: 2000,
      });
    },
  });
  const { data: searchResults } = trpc.crm.searchJob.useQuery(
    { jobId, query: searchQuery, type: "all" },
    { enabled: searchQuery.length > 2 }
  );
  const { data: team } = trpc.users.getTeam.useQuery();
  const { data: teamLeads } = trpc.users.getTeamLeads.useQuery();
  const { data: editHistoryData } = trpc.crm.getEditHistory.useQuery(
    { jobId, limit: 100 },
    { enabled: jobId > 0 && permissions?.canViewEditHistory }
  );

  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Job updated successfully");
      refetch();
      // Broadcast update to other users viewing this job
      broadcast("status", { updated: true });
    },
    onError: (error) => toast.error(error.message),
  });

  // Validate job data before allowing status change
  const validateStatusChange = (newStatus: string, job: any): boolean => {
    // Statuses that don't require validation (early pipeline stages)
    const allowedWithoutData = ['lead', 'appointment_set'];
    
    if (allowedWithoutData.includes(newStatus)) {
      return true;
    }

    // All other statuses require phone AND email
    const hasPhone = job.phone && job.phone.trim() !== '';
    const hasEmail = job.email && job.email.trim() !== '';

    if (!hasPhone || !hasEmail) {
      toast.error('Cannot advance pipeline: Customer Phone and Email are required.', {
        duration: 5000,
      });
      return false;
    }

    return true;
  };

  // Handler for status change with validation
  const handleStatusChange = (newStatus: string) => {
    if (!jobData?.job) return;

    if (validateStatusChange(newStatus, jobData.job)) {
      updateLead.mutate({ id: jobId, status: newStatus as JobStatus });
    }
  };

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

  const generateReport = trpc.crm.generateRoofReport.useMutation({
    onSuccess: (data) => {
      if (data.coverage) {
        toast.success("Production report generated successfully!");
      } else {
        toast.warning("3D Roof Data Not Available - Manual measurements required");
      }
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

  const markMessagesAsRead = trpc.activities.markMessagesAsRead.useMutation();

  const uploadDocument = trpc.documents.uploadDocument.useMutation({
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

  const deleteDocument = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteEditHistory = trpc.crm.deleteEditHistory.useMutation({
    onSuccess: () => {
      toast.success("History entry deleted");
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    
    // Convert files to base64
    const attachments = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
          };
          reader.readAsDataURL(file);
        });
        return {
          fileName: file.name,
          fileData: base64,
          fileType: file.type,
        };
      })
    );
    
    addMessage.mutate(
      { 
        jobId: jobId, 
        message: newMessage || "(File attachment)",
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      {
        onSuccess: () => {
          setNewMessage("");
          setSelectedFiles([]);
          refetch();
        },
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.lead || { label: "Unknown", color: "bg-gray-500", icon: AlertCircle };
  // Extra safety: ensure color property exists
  const safeStatusConfig = {
    ...statusConfig,
    color: statusConfig?.color || "bg-gray-500",
    label: statusConfig?.label || "Unknown",
    icon: statusConfig?.icon || AlertCircle
  };
  const canEdit = jobPermissions?.canEdit ?? false;
  const canDelete = jobPermissions?.canDelete ?? false;
  const canViewHistory = jobPermissions?.canViewHistory ?? false;

  // Filter tabs based on permissions and job stage
  const visibleTabs = TABS.filter(tab => {
    if (tab.requiresPermission === "canViewHistory") {
      return canViewHistory;
    }
    if ((tab as any).requiresStage) {
      return (tab as any).requiresStage.includes(job.status);
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${safeStatusConfig.color}`}>
                {safeStatusConfig.label}
              </span>
              {canEdit && (
                <>
                  <Select
                    value={job.status}
                    onValueChange={handleStatusChange}
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
                </>
              )}
              {/* Draft Supplier Order - Owner/Office Only */}
              {permissions && (permissions.role === 'owner' || permissions.role === 'office') && job.solarApiData?.totalArea && (
                <Button
                  onClick={() => setShowMaterialDialog(true)}
                  className="bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 font-semibold"
                  size="sm"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Draft Supplier Order
                </Button>
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
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === "messages") {
                    markMessagesAsRead.mutate({ jobId });
                  }
                }}
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
            <div className="space-y-6">
              {/* Animated Pipeline Tracker */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Pipeline Status</CardTitle>
                    {canEdit && (
                      <div className="flex items-center gap-3">
                        <button
                          className="
                            group relative px-5 py-2.5 rounded-full
                            bg-slate-800/80 backdrop-blur-sm
                            border-2 border-slate-600/50
                            text-slate-300 font-semibold text-sm
                            transition-all duration-300 ease-out
                            hover:scale-105 hover:bg-slate-700/80 hover:border-slate-500 hover:text-white
                            hover:shadow-[0_0_20px_rgba(100,116,139,0.3)]
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                            disabled:hover:bg-slate-800/80 disabled:hover:border-slate-600/50
                            flex items-center gap-2
                          "
                          disabled={PIPELINE_ORDER.indexOf(job.status) === 0 || !PIPELINE_ORDER.includes(job.status)}
                          onClick={() => {
                            const currentIndex = PIPELINE_ORDER.indexOf(job.status);
                            if (currentIndex > 0) {
                              const prevStatus = PIPELINE_ORDER[currentIndex - 1];
                              updateLead.mutate({ id: jobId, status: prevStatus as JobStatus });
                            }
                          }}
                        >
                          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                          Previous
                        </button>
                        <button
                          className="
                            group relative px-6 py-2.5 rounded-full
                            bg-gradient-to-r from-[#00d4aa] to-[#00b894]
                            border-2 border-[#00d4aa]
                            text-white font-bold text-sm
                            transition-all duration-300 ease-out
                            hover:scale-110 hover:shadow-[0_0_30px_rgba(0,212,170,0.6)]
                            hover:from-[#00e6bc] hover:to-[#00d4aa]
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                            disabled:hover:shadow-none
                            flex items-center gap-2
                          "
                          disabled={PIPELINE_ORDER.indexOf(job.status) === PIPELINE_ORDER.length - 1 || !PIPELINE_ORDER.includes(job.status)}
                          onClick={() => {
                            const currentIndex = PIPELINE_ORDER.indexOf(job.status);
                            if (currentIndex < PIPELINE_ORDER.length - 1 && currentIndex !== -1) {
                              const nextStatus = PIPELINE_ORDER[currentIndex + 1];
                              updateLead.mutate({ id: jobId, status: nextStatus as JobStatus });
                            }
                          }}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <JobPipelineTracker currentStatus={job.status} />
                </CardContent>
              </Card>

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
                      <div>
                        <label className="text-sm text-slate-400">Roof Age</label>
                        <Input
                          value={customerForm.roofAge}
                          onChange={(e) => setCustomerForm({ ...customerForm, roofAge: e.target.value })}
                          placeholder="e.g., 15 years"
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm text-slate-400">Roof Concerns</label>
                        <Textarea
                          value={customerForm.roofConcerns}
                          onChange={(e) => setCustomerForm({ ...customerForm, roofConcerns: e.target.value })}
                          placeholder="Describe any roof concerns..."
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                          rows={3}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customerForm.handsOnInspection}
                            onChange={(e) => setCustomerForm({ ...customerForm, handsOnInspection: e.target.checked })}
                            className="rounded border-slate-600 bg-slate-700 text-[#00d4aa] focus:ring-[#00d4aa]"
                          />
                          Hands-On Inspection Requested
                        </label>
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
                            {job.latitude && job.longitude ? (
                              <p className="text-xs text-[#00d4aa] mt-1">
                                📍 GPS: {job.latitude.toFixed(6)}, {job.longitude.toFixed(6)}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500 mt-1">
                                ⚠️ Location coordinates not set
                              </p>
                            )}
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
                    {/* Status */}
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Status</p>
                      {canEdit ? (
                        <Select
                          value={job.status}
                          onValueChange={(value) => updateLead.mutate({ id: jobId, status: value as JobStatus })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="lead" className="text-white hover:bg-slate-600">Lead</SelectItem>
                            <SelectItem value="appointment_set" className="text-white hover:bg-slate-600">Appointment Set</SelectItem>
                            <SelectItem value="prospect" className="text-white hover:bg-slate-600">Prospect</SelectItem>
                            <SelectItem value="approved" className="text-white hover:bg-slate-600">Approved</SelectItem>
                            <SelectItem value="project_scheduled" className="text-white hover:bg-slate-600">Project Scheduled</SelectItem>
                            <SelectItem value="completed" className="text-white hover:bg-slate-600">Completed</SelectItem>
                            <SelectItem value="invoiced" className="text-white hover:bg-slate-600">Invoiced</SelectItem>
                            <SelectItem value="lien_legal" className="text-white hover:bg-slate-600">Lien Legal</SelectItem>
                            <SelectItem value="closed_deal" className="text-white hover:bg-slate-600">Closed Deal</SelectItem>
                            <SelectItem value="closed_lost" className="text-white hover:bg-slate-600">Closed Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium text-white">{statusConfig.label}</p>
                      )}
                    </div>

                    {/* Priority */}
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Priority</p>
                      {canEdit ? (
                        <Select
                          value={job.priority}
                          onValueChange={(value) => updateLead.mutate({ id: jobId, priority: value })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8">
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

                    {/* Deal Type */}
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Deal Type</p>
                      {canEdit ? (
                        <Select
                          value={job.dealType || "not_set"}
                          onValueChange={(value) => updateLead.mutate({ id: jobId, dealType: value === "not_set" ? undefined : value as DealType })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="not_set" className="text-white hover:bg-slate-600">Not Set</SelectItem>
                            <SelectItem value="insurance" className="text-white hover:bg-slate-600">Insurance</SelectItem>
                            <SelectItem value="cash" className="text-white hover:bg-slate-600">Cash</SelectItem>
                            <SelectItem value="financed" className="text-white hover:bg-slate-600">Financed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium text-white capitalize">{job.dealType || "Not Set"}</p>
                      )}
                    </div>

                    {/* Scheduled Date */}
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Scheduled Date</p>
                      <ScheduledDateEditor
                        jobId={jobId}
                        initialDate={job.scheduledDate ? job.scheduledDate.toISOString() : null}
                        canEdit={canEdit}
                        onUpdate={refetch}
                      />
                    </div>

                    {/* Roof Age */}
                    <div>
                      <p className="text-sm text-slate-400">Roof Age</p>
                      <p className="font-medium text-white">{job.roofAge || "Not specified"}</p>
                    </div>

                    {/* Hands-On Inspection */}
                    <div>
                      <p className="text-sm text-slate-400">Hands-On Inspection</p>
                      <p className="font-medium text-white">{job.handsOnInspection ? "Yes" : "No"}</p>
                    </div>

                    {/* Lead Source */}
                    <div>
                      <p className="text-sm text-slate-400">Lead Source</p>
                      <p className="font-medium text-white capitalize">{job.leadSource || "Website"}</p>
                    </div>

                    {/* Amount Paid */}
                    <div>
                      <p className="text-sm text-slate-400">Amount Paid</p>
                      <p className="font-medium text-white">${((job.amountPaid || 0) / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Roof Concerns */}
                  {job.roofConcerns && (
                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-sm text-slate-400 mb-2">Roof Concerns</p>
                      <p className="text-slate-300">{job.roofConcerns}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Insurance Information Card */}
              {job.dealType === 'insurance' && (
                <InsuranceInfoCard
                  jobId={jobId}
                  insuranceCarrier={job.insuranceCarrier}
                  policyNumber={job.policyNumber}
                  claimNumber={job.claimNumber}
                  deductible={job.deductible}
                  onUpdate={refetch}
                />
              )}

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
                  {/* Team Lead Assignment */}
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Team Lead / Overseer</p>
                    {canEdit ? (
                      <Select
                        value={job.teamLeadId?.toString() || "none"}
                        onValueChange={(value) => updateLead.mutate({ 
                          id: jobId, 
                          teamLeadId: value === "none" ? null : parseInt(value) 
                        })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select team lead" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="none" className="text-white hover:bg-slate-600">
                            No Team Lead
                          </SelectItem>
                          {teamLeads?.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id.toString()} className="text-white hover:bg-slate-600">
                              <span className="flex items-center gap-2">
                                {lead.name || lead.email}
                                {lead.role === "owner" && (
                                  <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Owner</span>
                                )}
                                {lead.role === "team_lead" && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Team Lead</span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-white">
                        {teamLeads?.find(l => l.id === job.teamLeadId)?.name || 
                         teamLeads?.find(l => l.id === job.teamLeadId)?.email || 
                         "No Team Lead"}
                      </p>
                    )}
                  </div>

                  {/* Assigned To */}
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
                    <InternalNotesEditor
                      jobId={jobId}
                      initialNotes={job.internalNotes || ""}
                      canEdit={canEdit}
                      onUpdate={refetch}
                    />
                  </div>
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">Created</p>
                    <p className="text-slate-300">{new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
          )}

          {/* Production Report Tab */}
          {activeTab === "production_report" && (
            <JobProductionTab
              job={job}
              jobId={jobId}
              onGenerateReport={() => generateReport.mutate({ jobId })}
              isGenerating={generateReport.isPending}
            />
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <JobDocumentsTab
              documents={filteredDocuments}
              canEdit={canEdit}
              canDelete={canDelete}
              isUploading={isUploading}
              onFileUpload={(e) => handleFileUpload(e, "document")}
              onDeleteDocument={(documentId) => deleteDocument.mutate({ documentId })}
              onPreviewDocument={setPreviewDocument}
            />
          )}

          {/* Photos Tab - Gallery View */}
          {activeTab === "photos" && (
            <JobPhotosTab
              photos={filteredPhotos}
              jobId={jobId}
              canEdit={canEdit}
              canDelete={canDelete}
              isUploading={isUploading}
              isOwner={permissions?.role === "owner"}
              onFileUpload={(e) => handleFileUpload(e, "photo")}
              onDeletePhoto={(photoId) => deleteDocument.mutate({ documentId: photoId })}
            />
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <JobMessagesTab
              messages={filteredMessages}
              canEdit={canEdit}
              newMessage={newMessage}
              onMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              isSending={addMessage.isPending}
              formatMentions={formatMentions}
            />
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <JobTimelineTab
              activities={filteredTimeline}
              activityIcons={ACTIVITY_ICONS}
            />
          )}

          {/* Proposal Tab */}
          {activeTab === "proposal" && (
            <JobProposalTab
              jobId={jobId}
              job={job}
              userRole={permissions?.role || "user"}
              onUpdate={() => refetch()}
            />
          )}

          {/* Edit History Tab (Owner/Admin only) */}
          {activeTab === "edit_history" && canViewHistory && (
            <JobEditHistoryTab
              editHistory={filteredEditHistory}
              canDelete={canDelete}
              onDeleteEntry={(id) => deleteEditHistory.mutate({ id })}
              fieldTypeConfig={FIELD_TYPE_CONFIG}
              editTypeColors={EDIT_TYPE_COLORS}
            />
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDocument(null)}
        >
          <div 
            className="bg-slate-900 rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#00d4aa]" />
                <h3 className="font-semibold text-white truncate max-w-md">{previewDocument.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewDocument.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </a>
                <a href={previewDocument.url} download>
                  <Button variant="outline" size="sm" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </a>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPreviewDocument(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4 bg-slate-800">
              {previewDocument.type.includes('image') ? (
                <div className="flex items-center justify-center h-[70vh]">
                  <img 
                    src={previewDocument.url} 
                    alt={previewDocument.name}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              ) : previewDocument.type.includes('pdf') || previewDocument.name.toLowerCase().endsWith('.pdf') ? (
                <div className="h-[70vh] w-full">
                  <iframe
                    src={`${previewDocument.url}#toolbar=1&navpanes=0`}
                    className="w-full h-full rounded border border-slate-700"
                    title={previewDocument.name}
                  />
                </div>
              ) : previewDocument.type.includes('video') ? (
                <div className="flex items-center justify-center h-[70vh]">
                  <video 
                    src={previewDocument.url} 
                    controls
                    className="max-w-full max-h-full rounded"
                  />
                </div>
              ) : previewDocument.type.includes('audio') ? (
                <div className="flex flex-col items-center justify-center h-[70vh]">
                  <div className="w-20 h-20 rounded-full bg-[#00d4aa]/20 flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-[#00d4aa]" />
                  </div>
                  <h4 className="text-xl font-semibold text-white mb-4">{previewDocument.name}</h4>
                  <audio src={previewDocument.url} controls className="w-full max-w-md" />
                </div>
              ) : previewDocument.type.includes('text') || 
                   previewDocument.name.match(/\.(txt|csv|json|xml|html|css|js|ts|md)$/i) ? (
                <div className="h-[70vh] w-full">
                  <iframe
                    src={previewDocument.url}
                    className="w-full h-full rounded border border-slate-700 bg-white"
                    title={previewDocument.name}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                  <div className="w-24 h-24 rounded-2xl bg-slate-700 flex items-center justify-center mb-6">
                    <FileText className="w-12 h-12 text-slate-400" />
                  </div>
                  <h4 className="text-xl font-semibold text-white mb-2">{previewDocument.name}</h4>
                  <p className="text-slate-400 mb-1">File Type: {previewDocument.type || 'Unknown'}</p>
                  <p className="text-sm text-slate-500 mb-6">This file type cannot be previewed in the browser</p>
                  <div className="flex gap-3">
                    <a href={previewDocument.url} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </Button>
                    </a>
                    <a href={previewDocument.url} download>
                      <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-700">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Material Email Dialog */}
      {showMaterialDialog && job.solarApiData && (
        <MaterialEmailDialog
          open={showMaterialDialog}
          onOpenChange={setShowMaterialDialog}
          jobAddress={`${job.address}, ${job.cityStateZip}`}
          roofArea={job.solarApiData.totalArea || 0}
          perimeter={job.solarApiData.perimeter}
          ridgeLength={job.solarApiData.ridgeLength}
          shingleColor={job.solarApiData.shingleColor}
        />
      )}
    </CRMLayout>
  );
}
