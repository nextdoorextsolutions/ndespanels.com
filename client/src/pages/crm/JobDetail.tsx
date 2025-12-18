import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/crm/CRMLayout";
import type { Job } from "@/types/job";
import type { ActivityTag } from "@/types/activity";

// Layout Components
import { JobDetailHeader } from "@/components/crm/job-detail/JobDetailHeader";
import { JobDetailTabs } from "@/components/crm/job-detail/JobDetailTabs";

// Tab Components
import { JobOverviewTab } from "@/components/crm/job-detail/JobOverviewTab";
import { JobProposalTab } from "@/components/crm/job-detail/JobProposalTab";
import { JobProductionTab } from "@/components/crm/job-detail/JobProductionTab";
import { JobDocumentsTab } from "@/components/crm/job-detail/JobDocumentsTab";
import { JobPhotosTab } from "@/components/crm/job-detail/JobPhotosTab";
import { JobMessagesTab } from "@/components/crm/job-detail/JobMessagesTab";
import { JobTimelineTab } from "@/components/crm/job-detail/JobTimelineTab";
import { JobEditHistoryTab } from "@/components/crm/job-detail/JobEditHistoryTab";
import EstimatorTool from "@/components/estimator/EstimatorTool";

// Custom Hooks
import { useJobMutations } from "@/hooks/job-detail/useJobMutations";
import { useJobTimeline } from "@/hooks/job-detail/useJobTimeline";
import { useDocumentUpload } from "@/hooks/job-detail/useDocumentUpload";

// Utilities
import { formatMentions, ACTIVITY_ICONS } from "@/utils/jobDetailHelpers";

export default function JobDetail() {
  // ============================================================================
  // ALL HOOKS MUST BE AT THE TOP - DO NOT ADD CONDITIONAL RETURNS BEFORE THIS
  // ============================================================================
  
  // Router hooks
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const jobId = parseInt(id || "0");

  // State hooks
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTags, setSelectedTags] = useState<ActivityTag[]>([]);
  const [filterTag, setFilterTag] = useState<ActivityTag | "all">("all");

  // Data fetching hooks
  const { data: job, isLoading, error, refetch } = trpc.crm.getLead.useQuery({ id: jobId });
  const { data: permissions } = trpc.users.getMyPermissions.useQuery();
  const { data: editHistory } = trpc.crm.getEditHistory.useQuery({ jobId });

  // Custom hooks
  const mutations = useJobMutations({
    jobId,
    onRefetch: refetch,
    onJobDeleted: () => setLocation("/crm"),
  });

  const { handleFileUpload } = useDocumentUpload({
    jobId,
    onRefetch: refetch,
  });

  // Timeline hook - must be called before any conditional returns
  const { filteredTimeline } = useJobTimeline({
    activities: job?.activities || [],
    filterTag,
    searchQuery,
  });

  // Effect hooks
  useEffect(() => {
    // Reset active tab when job ID changes
    setActiveTab("overview");
    // Refetch data for the new job
    refetch();
  }, [jobId, refetch]);

  // Realtime updates
  // useRealtimeJob(jobId, refetch); // TODO: Fix hook signature

  // ============================================================================
  // END OF HOOKS - Conditional logic and handlers can go below
  // ============================================================================

  // Permissions (derived state, not hooks)
  const canEdit = permissions?.role === "owner" || permissions?.role === "team_lead" || permissions?.role === "sales_rep";
  const canDelete = permissions?.role === "owner";
  const canViewHistory = permissions?.role === "owner" || permissions?.role === "admin";

  // Handlers
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    mutations.addMessage.mutate({
      leadId: jobId,
      note: newMessage,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    }, {
      onSuccess: () => {
        setNewMessage("");
        setSelectedTags([]); // Clear tags after sending
      }
    });
  };

  const handleReply = (text: string, parentId: number) => {
    if (!text.trim()) return;
    mutations.addMessage.mutate({
      leadId: jobId,
      note: text,
      parentId: parentId,
    });
  };

  // Loading & Error states - NOW AFTER ALL HOOKS
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
    const errorMessage = error instanceof Error ? error.message : "Failed to load job";
    const isNotFound = errorMessage.includes("not found");
    const isPermission = errorMessage.includes("permission");
    
    return (
      <CRMLayout>
        <div className="flex flex-col items-center justify-center h-screen px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full text-center">
            <div className="text-red-400 text-5xl mb-4">
              {isNotFound ? "🔍" : isPermission ? "🔒" : "⚠️"}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isNotFound ? "Job Not Found" : isPermission ? "Access Denied" : "Error Loading Job"}
            </h2>
            <p className="text-slate-400 mb-6">
              {isNotFound 
                ? "This job doesn't exist or may have been deleted."
                : isPermission
                ? "You don't have permission to view this job."
                : errorMessage}
            </p>
            <Link href="/crm">
              <a className="inline-block bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold px-6 py-3 rounded-lg transition-colors">
                ← Back to CRM
              </a>
            </Link>
          </div>
        </div>
      </CRMLayout>
    );
  }

  // Extract data from job response
  const documents = job?.documents || [];
  const rawActivities = job?.activities || [];

  // Filter data based on search
  const filteredDocuments = documents.filter((doc: any) =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPhotos = documents.filter((doc: any) =>
    doc.fileType?.startsWith("image/") && doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredMessages = rawActivities.filter((msg: any) =>
    msg.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredEditHistory = (editHistory || []).filter((edit: any) =>
    edit.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CRMLayout>
      <div className="min-h-screen bg-slate-900">
        {/* Header Component */}
        <JobDetailHeader
          job={job as Job}
          jobId={jobId}
          canEdit={canEdit}
          canDelete={canDelete}
          showDeleteDialog={showDeleteDialog}
          setShowDeleteDialog={setShowDeleteDialog}
          onToggleFollowUp={() => mutations.toggleFollowUp.mutate({ 
            jobId, 
            needsFollowUp: !(job as any).needsFollowUp 
          })}
          onDeleteJob={() => mutations.deleteJob.mutate({ id: jobId })}
          isDeleting={mutations.deleteJob.isPending}
        />

        {/* Tabs Component */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-14 md:top-14 z-40 backdrop-blur-sm pt-4">
          <JobDetailTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <JobOverviewTab
              job={job as Job} // Backend returns job with activities/documents arrays
              jobId={jobId}
              canEdit={canEdit}
              onCustomerSave={(data) => mutations.updateCustomerInfo.mutate({ id: jobId, ...data } as any)}
              onStatusChange={(newStatus) => mutations.updateLead.mutate({ id: jobId, status: newStatus })}
              isSaving={mutations.updateCustomerInfo.isPending}
            />
          )}

          {activeTab === "production_report" && (
            <JobProductionTab
              job={job as Job} // Backend returns job with activities/documents arrays
              jobId={jobId}
              onGenerateReport={() => mutations.generateReport.mutate({ jobId })}
              isGenerating={mutations.generateReport.isPending}
            />
          )}

          {activeTab === "documents" && (
            <JobDocumentsTab
              documents={filteredDocuments}
              canEdit={canEdit}
              canDelete={canDelete}
              isUploading={mutations.uploadDocument.isPending}
              onFileUpload={(e) => handleFileUpload(e, "document")}
              onDeleteDocument={(documentId) => mutations.deleteDocument.mutate({ documentId })}
              onPreviewDocument={(doc) => window.open(doc.url, "_blank")}
            />
          )}

          {activeTab === "photos" && (
            <JobPhotosTab
              photos={filteredPhotos}
              jobId={jobId}
              canEdit={canEdit}
              canDelete={canDelete}
              isUploading={mutations.uploadDocument.isPending}
              isOwner={permissions?.role === "owner"}
              onFileUpload={(e) => handleFileUpload(e, "photo")}
              onDeletePhoto={(photoId) => mutations.deleteDocument.mutate({ documentId: photoId })}
            />
          )}

          {activeTab === "messages" && (
            <JobMessagesTab
              messages={filteredMessages}
              canEdit={canEdit}
              newMessage={newMessage}
              onMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              isSending={mutations.addMessage.isPending}
              formatMentions={formatMentions}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          )}

          {activeTab === "timeline" && (
            <JobTimelineTab
              activities={filteredTimeline}
              activityIcons={ACTIVITY_ICONS}
              onReply={handleReply}
              filterTag={filterTag}
              onFilterChange={setFilterTag}
            />
          )}

          {activeTab === "proposal" && (
            <JobProposalTab
              jobId={jobId}
              job={job as Job} // Backend returns job with activities/documents arrays
              userRole={permissions?.role || "user"}
              onUpdate={() => refetch()}
            />
          )}

          {activeTab === "estimator" && (
            <EstimatorTool />
          )}

          {activeTab === "edit_history" && canViewHistory && (
            <JobEditHistoryTab
              editHistory={filteredEditHistory}
              canDelete={canDelete}
              onDeleteEntry={(id) => mutations.deleteEditHistory.mutate({ id })}
              fieldTypeConfig={{}}
              editTypeColors={{}}
            />
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
