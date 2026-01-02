import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface FinancialSummaryCardProps {
  jobId: number;
}

export function FinancialSummaryCard({ jobId }: FinancialSummaryCardProps) {
  const { data: job } = trpc.crm.getLead.useQuery({ id: jobId });
  const { data: changeOrderSummary } = trpc.changeOrders.getJobSummary.useQuery({ jobId });
  const { data: invoices = [] } = trpc.invoices.getJobInvoices.useQuery({ jobId });

  // Calculate total invoiced (amounts stored in cents, convert to dollars)
  const totalInvoiced = invoices
    .filter(inv => inv.status !== "cancelled")
    .reduce((sum, inv) => sum + (Number(inv.totalAmount) / 100), 0);

  // Calculate base invoiced (excluding supplements, amounts in cents)
  const baseInvoiced = invoices
    .filter(inv => inv.status !== "cancelled" && inv.invoiceType !== "supplement")
    .reduce((sum, inv) => sum + (Number(inv.totalAmount) / 100), 0);

  // Calculate base contract value
  let baseContractValue = job?.totalPrice ? parseFloat(job.totalPrice.toString()) : 0;
  
  if (baseContractValue === 0 && baseInvoiced > 0) {
    baseContractValue = baseInvoiced;
  }

  // Calculate totals
  const approvedChanges = changeOrderSummary?.totalApproved || 0;
  const totalContractValue = baseContractValue + approvedChanges;
  const remainingBalance = totalContractValue - totalInvoiced;
  
  // Calculate collected (payments received) - stored in cents
  const totalCollected = job?.amountPaid ? (job.amountPaid / 100) : 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Determine status
  const isFullyInvoiced = remainingBalance <= 0;
  const hasOverage = remainingBalance < 0;

  return (
    <Card className="glass-card bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700/50 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Column 1: Contract Price */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Contract Price</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ${formatCurrency(totalContractValue)}
          </div>
          <div className="text-xs text-slate-500">
            Base: ${formatCurrency(baseContractValue)}
            {approvedChanges > 0 && ` + Changes: $${formatCurrency(approvedChanges)}`}
          </div>
        </div>

        {/* Column 2: Total Invoiced */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <FileText className="w-4 h-4" />
            <span>Total Invoiced</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            ${formatCurrency(totalInvoiced)}
          </div>
          <div className="text-xs text-slate-500">
            {invoices.filter(inv => inv.status !== "cancelled").length} invoice(s)
          </div>
        </div>

        {/* Column 3: Remaining Balance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <DollarSign className="w-4 h-4" />
            <span>Remaining Balance</span>
          </div>
          {isFullyInvoiced && !hasOverage ? (
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-green-400">$0.00</div>
              <div className="px-2 py-1 bg-green-500/20 border border-green-500/40 rounded-md">
                <span className="text-xs font-semibold text-green-400">PAID IN FULL</span>
              </div>
            </div>
          ) : (
            <div className={`text-3xl font-bold ${
              hasOverage ? 'text-red-400' : 'text-orange-400'
            }`}>
              ${formatCurrency(Math.abs(remainingBalance))}
            </div>
          )}
          <div className="text-xs text-slate-500">
            {isFullyInvoiced ? (hasOverage ? 'Over-invoiced' : 'Fully invoiced') : 'Unbilled revenue'}
          </div>
        </div>

        {/* Column 4: Collected */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Collected</span>
          </div>
          <div className="text-3xl font-bold text-green-400">
            ${formatCurrency(totalCollected)}
          </div>
          <div className="text-xs text-slate-500">
            Total payments received
          </div>
        </div>
      </div>

      {/* Warning for over-invoiced */}
      {hasOverage && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-300">
            <strong>Warning:</strong> Total invoiced (${formatCurrency(totalInvoiced)}) exceeds contract value (${formatCurrency(totalContractValue)}) by ${formatCurrency(Math.abs(remainingBalance))}.
          </div>
        </div>
      )}
    </Card>
  );
}
