import { useState } from "react";
import { ProposalCalculator } from "../ProposalCalculator";
import { ProductSelector } from "../proposal/ProductSelector";
import type { Job } from "@/types";

interface JobProposalTabProps {
  jobId: number;
  job: Job;
  userRole: string;
  onUpdate: () => void;
}

export function JobProposalTab({ jobId, job, userRole, onUpdate }: JobProposalTabProps) {
  const [selectedShingleId, setSelectedShingleId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Shingle Product</h3>
        <ProductSelector 
          selectedProductId={selectedShingleId} 
          onChange={setSelectedShingleId} 
        />
      </div>

      {/* Proposal Calculator */}
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
