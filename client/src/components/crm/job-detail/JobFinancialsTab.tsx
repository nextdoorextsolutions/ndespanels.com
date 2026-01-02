/**
 * JobFinancialsTab Component
 * Main financial management tab for jobs
 * Integrates: FinancialLedger, ChangeOrderManager, InvoiceManager
 */

import { useState } from "react";
import { FinancialSummaryCard } from "./financials/FinancialSummaryCard";
import { FinancialLedger } from "./financials/FinancialLedger";
import { ChangeOrderManager } from "./financials/ChangeOrderManager";
import { InvoiceManager } from "./financials/InvoiceManager";
import type { Job } from "@/types";

interface JobFinancialsTabProps {
  job: Job;
  jobId: number;
  canEdit: boolean;
  jobDealType: "insurance" | "retail" | "warranty";
}

export function JobFinancialsTab({ job, jobId, canEdit, jobDealType }: JobFinancialsTabProps) {
  // State for cross-component communication
  const [preSelectedChangeOrderId, setPreSelectedChangeOrderId] = useState<number | undefined>(undefined);

  // Handler for "Bill This" button in ChangeOrderManager
  const handleBillChangeOrder = (changeOrderId: number) => {
    setPreSelectedChangeOrderId(changeOrderId);
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary - Top Level Overview */}
      <FinancialSummaryCard jobId={jobId} />

      {/* 1. Financial Ledger - The Source of Truth */}
      <FinancialLedger 
        jobId={jobId}
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
        preSelectedChangeOrderId={preSelectedChangeOrderId}
      />
    </div>
  );
}
