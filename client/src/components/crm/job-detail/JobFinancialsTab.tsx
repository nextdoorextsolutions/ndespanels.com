/**
 * JobFinancialsTab Component
 * Main financial management tab for jobs
 * Integrates: FinancialLedger, ChangeOrderManager, InvoiceManager
 */

import { useState } from "react";
import { FinancialLedger } from "./financials/FinancialLedger";
import { ChangeOrderManager } from "./financials/ChangeOrderManager";
import { InvoiceManager } from "./financials/InvoiceManager";
import type { Job } from "@/types";

interface JobFinancialsTabProps {
  job: Job;
  jobId: number;
  canEdit: boolean;
}

export function JobFinancialsTab({ job, jobId, canEdit }: JobFinancialsTabProps) {
  // State for cross-component communication
  const [preSelectedChangeOrderId, setPreSelectedChangeOrderId] = useState<number | undefined>(undefined);

  // Calculate base contract value from proposal
  const baseContractValue = job.totalPrice ? parseFloat(job.totalPrice.toString()) : 0;

  // Handler for "Bill This" button in ChangeOrderManager
  const handleBillChangeOrder = (changeOrderId: number) => {
    setPreSelectedChangeOrderId(changeOrderId);
    // The InvoiceManager will detect this and open its modal with supplement pre-selected
    // We need to trigger the modal open - let's use a ref or state
    // For now, we'll pass it as a prop and InvoiceManager will handle it
  };

  return (
    <div className="space-y-6">
      {/* 1. Financial Ledger - The Source of Truth */}
      <FinancialLedger 
        jobId={jobId} 
        baseContractValue={baseContractValue}
      />

      {/* 2. Change Order Manager - The Scope */}
      {canEdit && (
        <ChangeOrderManager 
          jobId={jobId}
          onBillChangeOrder={handleBillChangeOrder}
        />
      )}

      {/* 3. Invoice Manager - The Billing */}
      <InvoiceManager 
        jobId={jobId}
        jobDealType={job.dealType || "retail"}
        baseContractValue={baseContractValue}
        preSelectedChangeOrderId={preSelectedChangeOrderId}
      />
    </div>
  );
}
