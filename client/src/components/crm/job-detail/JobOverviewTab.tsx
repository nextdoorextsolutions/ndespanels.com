import { CustomerCard } from "./overview/CustomerCard";
import { JobPipeline } from "./overview/JobPipeline";
import { PropertyCard } from "./overview/PropertyCard";
import { QuickActions } from "./overview/QuickActions";
import { InsuranceInfoCard } from "../InsuranceInfoCard";
import { ApprovedAmountCard } from "./overview/ApprovedAmountCard";
import { ChangeOrderCard } from "./overview/ChangeOrderCard";
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
  const showApprovedAmount = statusIndex >= 3; // Show from "approved" onwards
  const showChangeOrders = statusIndex >= 5; // Show from "completed" onwards

  return (
    <div className="space-y-6">
      {/* Pipeline Status */}
      <JobPipeline
        currentStatus={job.status}
        canEdit={canEdit}
        onStatusChange={onStatusChange}
      />

      {/* Approved Amount Section (visible after approval) */}
      {showApprovedAmount && (
        <ApprovedAmountCard
          jobId={jobId}
          approvedAmount={job.approvedAmount}
          canEdit={canEdit}
        />
      )}

      {/* Change Orders Section (visible when completed or later) */}
      {showChangeOrders && (
        <ChangeOrderCard
          jobId={jobId}
          extrasCharged={job.extrasCharged}
          supplementNumbers={job.supplementNumbers}
          approvedAmount={job.approvedAmount}
          canEdit={canEdit}
        />
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
