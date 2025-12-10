import { ProposalCalculator } from "../ProposalCalculator";
import type { Job } from "@/types";

interface JobProposalTabProps {
  jobId: number;
  job: Job;
  userRole: string;
  onUpdate: () => void;
}

export function JobProposalTab({ jobId, job, userRole, onUpdate }: JobProposalTabProps) {
  return (
    <div>
      <ProposalCalculator
        jobId={jobId}
        roofArea={job.solarApiData?.totalArea}
        manualAreaSqFt={job.manualAreaSqFt || undefined}
        solarCoverage={job.solarApiData?.solarCoverage || false}
        currentPricePerSq={job.pricePerSq}
        currentTotalPrice={job.totalPrice}
        currentCounterPrice={job.counterPrice}
        currentPriceStatus={job.priceStatus || undefined}
        userRole={userRole}
        onUpdate={onUpdate}
      />
    </div>
  );
}
