/**
 * FinancialLedger Component
 * The Source of Truth - Displays the live contract value and billing status
 */

import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface FinancialLedgerProps {
  jobId: number;
}

export function FinancialLedger({ jobId }: FinancialLedgerProps) {
  // Fetch job data to get current totalPrice
  const { data: job } = trpc.crm.getLead.useQuery({ id: jobId });
  
  // Fetch change orders summary
  const { data: changeOrderSummary } = trpc.changeOrders.getJobSummary.useQuery({ jobId });
  
  // Fetch job invoices
  const { data: invoices = [] } = trpc.invoices.getJobInvoices.useQuery({ jobId });

  // Calculate total invoiced
  const totalInvoiced = invoices
    .filter(inv => inv.status !== "cancelled")
    .reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0);

  // Calculate base contract value
  // If totalPrice is set, use it. Otherwise, use total invoiced as the base contract (for legacy jobs)
  let baseContractValue = job?.totalPrice ? parseFloat(job.totalPrice.toString()) : 0;
  
  if (baseContractValue === 0 && totalInvoiced > 0) {
    // Legacy job: Use invoiced amount as base contract
    baseContractValue = totalInvoiced;
  }

  // Calculate totals
  const approvedChanges = changeOrderSummary?.totalApproved || 0;
  const totalJobValue = baseContractValue + approvedChanges;
  const unbilledRevenue = totalJobValue - totalInvoiced;

  // Determine alert state
  const hasUnbilledRevenue = unbilledRevenue > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Base Contract */}
      <Card className="glass-card bg-slate-800/60 border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-400">Base Contract</h3>
        </div>
        <p className="text-2xl font-bold text-white">
          ${baseContractValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </Card>

      {/* Approved Changes */}
      <Card className="glass-card bg-slate-800/60 border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-400">Approved Changes</h3>
        </div>
        <p className="text-2xl font-bold text-white">
          +${approvedChanges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {changeOrderSummary && changeOrderSummary.approvedCount > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            {changeOrderSummary.approvedCount} change order{changeOrderSummary.approvedCount !== 1 ? 's' : ''}
          </p>
        )}
      </Card>

      {/* Total Job Value - THE MOST IMPORTANT NUMBER */}
      <Card className="glass-card bg-gradient-to-br from-[#00d4aa]/10 to-cyan-500/10 border-[#00d4aa]/30 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00d4aa]/5 via-transparent to-cyan-500/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#00d4aa]/20">
              <DollarSign className="w-5 h-5 text-[#00d4aa]" />
            </div>
            <h3 className="text-sm font-bold text-[#00d4aa]">Total Job Value</h3>
          </div>
          <p className="text-3xl font-black text-white">
            ${totalJobValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">Contract + Changes</p>
        </div>
      </Card>

      {/* Total Invoiced */}
      <Card className="glass-card bg-slate-800/60 border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-400">Total Invoiced</h3>
        </div>
        <p className="text-2xl font-bold text-white">
          ${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {invoices.length > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        )}
      </Card>

      {/* Unbilled Revenue */}
      <Card className={`glass-card p-6 ${
        hasUnbilledRevenue 
          ? 'bg-yellow-500/10 border-yellow-500/30' 
          : 'bg-slate-800/60 border-slate-700/50'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${
            hasUnbilledRevenue ? 'bg-yellow-500/20' : 'bg-slate-700/50'
          }`}>
            <AlertCircle className={`w-5 h-5 ${
              hasUnbilledRevenue ? 'text-yellow-400' : 'text-slate-500'
            }`} />
          </div>
          <h3 className={`text-sm font-medium ${
            hasUnbilledRevenue ? 'text-yellow-400' : 'text-slate-400'
          }`}>
            Unbilled Revenue
          </h3>
        </div>
        <p className={`text-2xl font-bold ${
          hasUnbilledRevenue ? 'text-yellow-300' : 'text-white'
        }`}>
          ${unbilledRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {hasUnbilledRevenue && (
          <p className="text-xs text-yellow-500 mt-1 font-medium">
            ⚠️ Generate invoice
          </p>
        )}
      </Card>
    </div>
  );
}
