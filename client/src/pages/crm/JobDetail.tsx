import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Trash2, Bell, BellOff, Phone, Mail, Navigation, Search } from "lucide-react";
import { Link } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/crm/CRMLayout";
import type { Job } from "@/types/job";
import type { ActivityTag } from "@/types/activity";

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
  const rawActivities = job?.activities || [];

  // Use timeline hook for filtering
  const { filteredTimeline } = useJobTimeline({
    activities: rawActivities,
    filterTag,
    searchQuery,
  });

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
        {/* Mobile Action Bar - Sticky at top on mobile */}
        <div className="md:hidden sticky top-14 z-50 bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-around gap-2">
            <a 
              href={`tel:${job.phone}`}
              className="flex-1"
            >
              <Button 
                className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold min-h-11"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call
              </Button>
            </a>
            <a 
              href={`sms:${job.phone}`}
              className="flex-1"
            >
              <Button 
                variant="outline"
                className="w-full border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10 min-h-11"
              >
                <Mail className="w-5 h-5 mr-2" />
                Text
              </Button>
            </a>
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address + ' ' + job.cityStateZip)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button 
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 min-h-11"
              >
                <Navigation className="w-5 h-5 mr-2" />
                Map
              </Button>
            </a>
          </div>
        </div>

        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-14 md:top-14 z-40 backdrop-blur-sm">
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
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => mutations.toggleFollowUp.mutate({ 
                      jobId, 
                      needsFollowUp: !job.needsFollowUp 
                    })}
                    className={job.needsFollowUp 
                      ? "bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/30"
                      : "border-slate-600 text-slate-300 hover:bg-slate-700"
                    }
                  >
                    {job.needsFollowUp ? (
                      <>
                        <BellOff className="w-4 h-4 mr-2" />
                        Clear Follow Up
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Request Follow Up
                      </>
                    )}
                  </Button>
                )}
                {canDelete && (
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="bg-red-900/20 border-red-600 text-red-400 hover:bg-red-900/40 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Job
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Job?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-300">
                        Are you sure you want to delete this job for <strong className="text-white">{job.fullName}</strong>?
                        <br /><br />
                        This will permanently delete:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Job details and customer information</li>
                          <li>All documents and photos</li>
                          <li>Messages and timeline</li>
                          <li>Edit history</li>
                        </ul>
                        <br />
                        <strong className="text-red-400">This action cannot be undone.</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => mutations.deleteJob.mutate({ id: jobId })}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {mutations.deleteJob.isPending ? "Deleting..." : "Delete Job"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                )}
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
                { id: "estimator", label: "Estimator" },
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
