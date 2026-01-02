import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TotalJobValueCardProps {
  jobId: number;
}

export function TotalJobValueCard({ jobId }: TotalJobValueCardProps) {
  // Fetch job data
  const { data: job } = trpc.crm.getLead.useQuery({ id: jobId });
  
  // Fetch change orders summary
  const { data: changeOrderSummary } = trpc.changeOrders.getJobSummary.useQuery({ jobId });
  
  // Fetch invoices
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
    // Legacy job: Use non-supplement invoiced amount as base contract
    baseContractValue = baseInvoiced;
  }

  // Calculate totals
  const approvedChanges = changeOrderSummary?.totalApproved || 0;
  const totalJobValue = baseContractValue + approvedChanges;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00d4aa]" />
          Total Job Value
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Total */}
          <div className="text-3xl font-bold text-[#00d4aa]">
            ${formatCurrency(totalJobValue)}
          </div>

          {/* Breakdown */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span>Base Contract:</span>
              <span className="text-white font-semibold">${formatCurrency(baseContractValue)}</span>
            </div>
            {approvedChanges > 0 && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Approved Changes:</span>
                <span className="text-green-400 font-semibold">+${formatCurrency(approvedChanges)}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Contract value including approved change orders
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
