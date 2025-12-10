import { useState } from "react";
import { useParams } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import { useRealtimeJob } from "@/hooks/useRealtimeJob";

// Tab Components
import { JobOverviewTab } from "@/components/crm/job-detail/JobOverviewTab";
import { JobProposalTab } from "@/components/crm/job-detail/JobProposalTab";
import { JobProductionTab } from "@/components/crm/job-detail/JobProductionTab";
import { JobDocumentsTab } from "@/components/crm/job-detail/JobDocumentsTab";
import { JobPhotosTab } from "@/components/crm/job-detail/JobPhotosTab";
import { JobMessagesTab } from "@/components/crm/job-detail/JobMessagesTab";
import { JobTimelineTab } from "@/components/crm/job-detail/JobTimelineTab";
import { JobEditHistoryTab } from "@/components/crm/job-detail/JobEditHistoryTab";

// Helper function to format mentions in messages
const formatMentions = (text: string) => {
  const mentionRegex = /@\[(\d+):([^\]]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-[#00d4aa] font-medium">
        @{match[2]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Activity Icons mapping
const ACTIVITY_ICONS: Record<string, any> = {
  status_change: ArrowLeft,
  note: Search,
  // Add more as needed
};

export default function JobDetail() {
  const { id } = useParams();
  const jobId = parseInt(id || "0");

  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Data fetching
  const { data: job, isLoading, error, refetch } = trpc.crm.getLead.useQuery({ id: jobId });
  const { data: permissions } = trpc.users.getMyPermissions.useQuery();
  const { data: editHistory } = trpc.crm.getEditHistory.useQuery({ jobId });

  // Mutations
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Job updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update job: ${error.message}`);
    },
  });

  const updateCustomerInfo = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Customer information updated");
      refetch();
    },
  });

  const generateReport = trpc.solar.generateReport.useMutation({
    onSuccess: () => {
      toast.success("Report generated successfully");
      refetch();
    },
  });

  const uploadDocument = trpc.documents.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded");
      refetch();
    },
  });

  const deleteDocument = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      refetch();
    },
  });

  const addMessage = trpc.activities.addNote.useMutation({
    onSuccess: () => {
      setNewMessage("");
      refetch();
    },
  });

  const deleteEditHistory = trpc.crm.deleteEditHistory.useMutation({
    onSuccess: () => {
      toast.success("History entry deleted");
      refetch();
    },
  });

  // Realtime updates
  // useRealtimeJob(jobId, refetch); // TODO: Fix hook signature

  // Permissions
  const canEdit = permissions?.role === "owner" || permissions?.role === "team_lead" || permissions?.role === "sales_rep";
  const canDelete = permissions?.role === "owner";
  const canViewHistory = permissions?.role === "owner" || permissions?.role === "admin";

  // Handlers
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    addMessage.mutate({
      leadId: jobId,
      note: newMessage,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "photo") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId.toString());
      formData.append("fileType", type);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          toast.success(`${type === "document" ? "Document" : "Photo"} uploaded`);
          refetch();
        } else {
          toast.error("Upload failed");
        }
      } catch (error) {
        toast.error("Upload error");
      }
    }
  };

  // Loading & Error states
  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  if (error || !job) {
    return (
      <CRMLayout>
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-red-400 mb-4">Failed to load job</p>
          <Link href="/crm">
            <a className="text-[#00d4aa] hover:underline">← Back to CRM</a>
          </Link>
        </div>
      </CRMLayout>
    );
  }

  // Extract data from job response
  const documents = job?.documents || [];
  const activities = job?.activities || [];

  // Filter data based on search
  const filteredDocuments = documents.filter((doc: any) =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPhotos = documents.filter((doc: any) =>
    doc.fileType?.startsWith("image/") && doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredMessages = activities.filter((msg: any) =>
    msg.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTimeline = activities.filter((activity: any) =>
    activity.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredEditHistory = (editHistory || []).filter((edit: any) =>
    edit.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CRMLayout>
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Link href="/crm">
                  <a className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </a>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">{job.fullName}</h1>
                  <p className="text-slate-400 text-sm">{job.address}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: "overview", label: "Overview" },
                { id: "production_report", label: "Production Report" },
                { id: "documents", label: "Documents" },
                { id: "photos", label: "Photos" },
                { id: "messages", label: "Messages" },
                { id: "timeline", label: "Timeline" },
                { id: "proposal", label: "Proposal" },
                { id: "edit_history", label: "Edit History" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#00d4aa] text-black"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          {activeTab !== "overview" && activeTab !== "proposal" && (
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <JobOverviewTab
              job={job as any}
              jobId={jobId}
              canEdit={canEdit}
              onCustomerSave={(data) => updateCustomerInfo.mutate({ id: jobId, ...data } as any)}
              onStatusChange={(newStatus) => updateLead.mutate({ id: jobId, status: newStatus })}
              isSaving={updateCustomerInfo.isPending}
            />
          )}

          {activeTab === "production_report" && (
            <JobProductionTab
              job={job as any}
              jobId={jobId}
              onGenerateReport={() => generateReport.mutate({ jobId })}
              isGenerating={generateReport.isPending}
            />
          )}

          {activeTab === "documents" && (
            <JobDocumentsTab
              documents={filteredDocuments}
              canEdit={canEdit}
              canDelete={canDelete}
              isUploading={uploadDocument.isPending}
              onFileUpload={(e) => handleFileUpload(e, "document")}
              onDeleteDocument={(documentId) => deleteDocument.mutate({ documentId })}
              onPreviewDocument={(doc) => window.open(doc.url, "_blank")}
            />
          )}

          {activeTab === "photos" && (
            <JobPhotosTab
              photos={filteredPhotos}
              jobId={jobId}
              canEdit={canEdit}
              canDelete={canDelete}
              isUploading={uploadDocument.isPending}
              isOwner={permissions?.role === "owner"}
              onFileUpload={(e) => handleFileUpload(e, "photo")}
              onDeletePhoto={(photoId) => deleteDocument.mutate({ documentId: photoId })}
            />
          )}

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

          {activeTab === "timeline" && (
            <JobTimelineTab
              activities={filteredTimeline}
              activityIcons={ACTIVITY_ICONS}
            />
          )}

          {activeTab === "proposal" && (
            <JobProposalTab
              jobId={jobId}
              job={job as any}
              userRole={permissions?.role || "user"}
              onUpdate={() => refetch()}
            />
          )}

          {activeTab === "edit_history" && canViewHistory && (
            <JobEditHistoryTab
              editHistory={filteredEditHistory}
              canDelete={canDelete}
              onDeleteEntry={(id) => deleteEditHistory.mutate({ id })}
              fieldTypeConfig={{}}
              editTypeColors={{}}
            />
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
