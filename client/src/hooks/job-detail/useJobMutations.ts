/**
 * useJobMutations Hook
 * Consolidates all tRPC mutations for JobDetail page
 */

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface UseJobMutationsProps {
  jobId: number;
  onRefetch: () => void;
  onJobDeleted?: () => void;
}

export function useJobMutations({ jobId, onRefetch, onJobDeleted }: UseJobMutationsProps) {
  const utils = trpc.useUtils();

  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Job updated successfully");
      onRefetch();
    },
    onError: (error) => {
      toast.error(`Failed to update job: ${error.message}`);
    },
  });

  const updateCustomerInfo = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Customer information updated");
      onRefetch();
    },
  });

  const generateReport = trpc.solar.generateReport.useMutation({
    onSuccess: () => {
      toast.success("Report generated successfully");
      onRefetch();
    },
  });

  const uploadDocument = trpc.documents.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded");
      onRefetch();
    },
  });

  const deleteDocument = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      onRefetch();
    },
  });

  const addMessage = trpc.activities.addNote.useMutation({
    onSuccess: () => {
      onRefetch();
    },
  });

  const deleteEditHistory = trpc.crm.deleteEditHistory.useMutation({
    onSuccess: () => {
      toast.success("History entry deleted");
      onRefetch();
    },
  });

  const toggleFollowUp = trpc.crm.toggleFollowUp.useMutation({
    onSuccess: () => {
      toast.success("Follow-up status updated");
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update follow-up status");
    },
  });

  const deleteJob = trpc.crm.deleteLead.useMutation({
    onSuccess: () => {
      toast.success("Job deleted successfully");
      // Invalidate all queries that might show this job
      utils.crm.getLeads.invalidate();
      utils.crm.getStats.invalidate();
      utils.crm.getMonthlyTrends.invalidate();
      utils.crm.getCategoryCounts.invalidate();
      utils.crm.getLienRightsJobs.invalidate();
      utils.crm.getLeadsByCategory.invalidate();
      onJobDeleted?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete job");
    },
  });

  return {
    updateLead,
    updateCustomerInfo,
    generateReport,
    uploadDocument,
    deleteDocument,
    addMessage,
    deleteEditHistory,
    toggleFollowUp,
    deleteJob,
  };
}
