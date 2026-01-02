import { CustomerCard } from "./overview/CustomerCard";
import { JobPipeline } from "./overview/JobPipeline";
import { PropertyCard } from "./overview/PropertyCard";
import { QuickActions } from "./overview/QuickActions";
import { InsuranceInfoCard } from "../InsuranceInfoCard";
import { ContractPriceCard } from "./overview/ContractPriceCard";
import { TotalJobValueCard } from "./overview/TotalJobValueCard";
import { JobAISummary } from "./JobAISummary";
import type { Job, JobStatus } from "@/types";

interface JobOverviewTabProps {
  job: Job;
  jobId: number;
  canEdit: boolean;
  onCustomerSave: (data: Partial<Job>) => void;
  onStatusChange: (newStatus: JobStatus) => void;
  isSaving: boolean;
}

export function JobOverviewTab({
  job,
  jobId,
  canEdit,
  onCustomerSave,
  onStatusChange,
  isSaving,
}: JobOverviewTabProps) {
  // Determine which financial cards to show based on status
  const statusIndex = ["lead", "appointment_set", "prospect", "approved", "project_scheduled", "completed", "invoiced", "lien_legal", "closed_deal", "closed_lost"].indexOf(job.status);
  const showFinancialSummary = statusIndex >= 3; // Show from "approved" onwards

  return (
    <div className="space-y-6">
      {/* Job-Specific AI Summary */}
      <JobAISummary jobId={jobId} />

      {/* Pipeline Status */}
      <JobPipeline
        currentStatus={job.status}
        canEdit={canEdit}
        onStatusChange={onStatusChange}
      />

      {/* Contract Price - Always visible */}
      <ContractPriceCard
        jobId={jobId}
        totalPrice={job.totalPrice ? parseFloat(job.totalPrice.toString()) : null}
        canEdit={canEdit}
      />

      {/* Total Job Value (visible after approval) */}
      {showFinancialSummary && (
        <TotalJobValueCard jobId={jobId} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <CustomerCard
          job={job}
          canEdit={canEdit}
          onSave={onCustomerSave}
          isSaving={isSaving}
        />

        {/* Property Info */}
        <PropertyCard job={job} />

        {/* Quick Actions */}
        <div className="space-y-6">
          <QuickActions job={job} />
          
          {/* Insurance Card (if applicable) */}
          {job.dealType === 'insurance' && (
            <InsuranceInfoCard
              jobId={jobId}
              insuranceCarrier={job.insuranceCarrier}
              policyNumber={job.policyNumber}
              claimNumber={job.claimNumber}
              deductible={job.deductible}
            />
          )}
        </div>
      </div>
    </div>
  );
}
