/**
 * InvoiceManager Component
 * Manages invoices with generate invoice modal
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Mail, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvoiceManagerProps {
  jobId: number;
  jobDealType: "insurance" | "retail" | "warranty";
  baseContractValue: number;
  preSelectedChangeOrderId?: number; // Set when "Bill This" is clicked
}

export function InvoiceManager({ 
  jobId, 
  jobDealType, 
  baseContractValue,
  preSelectedChangeOrderId 
}: InvoiceManagerProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"deposit" | "progress" | "supplement" | "final">("deposit");
  const [customAmount, setCustomAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedChangeOrderIds, setSelectedChangeOrderIds] = useState<number[]>([]);

  const utils = trpc.useUtils();

  // Fetch invoices
  const { data: invoices = [] } = trpc.invoices.getJobInvoices.useQuery({ jobId });
  
  // Fetch unbilled change orders (for supplement invoices)
  const { data: unbilledChangeOrders = [] } = trpc.changeOrders.getUnbilledChangeOrders.useQuery({ jobId });

  // Generate invoice mutation
  const generateMutation = trpc.invoices.convertToInvoice.useMutation({
    onSuccess: (data) => {
      toast.success(`Invoice ${data.invoiceNumber} created for $${data.totalAmount.toFixed(2)}`);
      setShowGenerateDialog(false);
      resetForm();
      // Invalidate to refresh all components
      utils.invoices.getJobInvoices.invalidate({ jobId });
      utils.changeOrders.getJobChangeOrders.invalidate({ jobId });
      utils.changeOrders.getJobSummary.invalidate({ jobId });
      utils.changeOrders.getUnbilledChangeOrders.invalidate({ jobId });
    },
    onError: (error) => {
      toast.error(`Failed to generate invoice: ${error.message}`);
    },
  });

  const resetForm = () => {
    setInvoiceType("deposit");
    setCustomAmount("");
    setDueDate("");
    setNotes("");
    setSelectedChangeOrderIds([]);
  };

  const handleOpenDialog = () => {
    // If pre-selected change order, auto-select supplement type
    if (preSelectedChangeOrderId) {
      setInvoiceType("supplement");
      setSelectedChangeOrderIds([preSelectedChangeOrderId]);
    }
    setShowGenerateDialog(true);
  };

  const handleGenerate = () => {
    const amountNum = customAmount ? parseFloat(customAmount) : undefined;
    
    // Validation
    if ((invoiceType === "deposit" || invoiceType === "progress") && (!amountNum || amountNum <= 0)) {
      toast.error("Please enter a valid amount for deposit/progress invoices");
      return;
    }
    
    if (invoiceType === "supplement" && selectedChangeOrderIds.length === 0) {
      toast.error("Please select at least one change order to bill");
      return;
    }

    generateMutation.mutate({
      jobId,
      invoiceType,
      customAmount: amountNum,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      changeOrderIds: invoiceType === "supplement" ? selectedChangeOrderIds : undefined,
    });
  };

  // Calculate smart default for deposit
  const getDepositDefault = () => {
    if (jobDealType === "insurance") {
      return "0.00"; // Custom amount for insurance
    } else {
      return (baseContractValue * 0.5).toFixed(2); // 50% for retail/cash
    }
  };

  // Set default amount when type changes
  const handleTypeChange = (type: "deposit" | "progress" | "supplement" | "final") => {
    setInvoiceType(type);
    
    if (type === "deposit") {
      setCustomAmount(getDepositDefault());
    } else if (type === "progress") {
      setCustomAmount(""); // User must enter
    } else if (type === "supplement" || type === "final") {
      setCustomAmount(""); // Auto-calculated
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      draft: { color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: FileText },
      sent: { color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: Mail },
      paid: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
      overdue: { color: "bg-red-500/10 text-red-400 border-red-500/30", icon: AlertCircle },
      cancelled: { color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: AlertCircle },
    };
    
    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;
    
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getInvoiceTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      deposit: "Deposit",
      progress: "Progress",
      supplement: "Supplement",
      final: "Final",
      other: "Other",
    };
    return labels[type || "other"] || "Other";
  };

  return (
    <Card className="glass-card bg-slate-800/60 border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Invoices</h2>
        <Button
          onClick={handleOpenDialog}
          className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Invoice
        </Button>
      </div>

      {/* Invoice List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Invoice #</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Type</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Due Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-4 px-4 font-mono text-white font-semibold">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-300">
                      {getInvoiceTypeLabel(invoice.invoiceType)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-white">
                    ${parseFloat(invoice.totalAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-400">
                    {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No invoices yet. Click "Generate Invoice" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Invoice Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Generate Invoice</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new invoice for this job
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Invoice Type */}
            <div>
              <Label className="text-white">Invoice Type</Label>
              <Select value={invoiceType} onValueChange={(v: any) => handleTypeChange(v)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="supplement">Supplement</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {invoiceType === "deposit" && "Initial payment before work begins"}
                {invoiceType === "progress" && "Partial payment during project"}
                {invoiceType === "supplement" && "Bill approved change orders"}
                {invoiceType === "final" && "Remaining balance after all work"}
              </p>
            </div>

            {/* Custom Amount (for deposit/progress) */}
            {(invoiceType === "deposit" || invoiceType === "progress") && (
              <div>
                <Label className="text-white">
                  Amount ($) {invoiceType === "deposit" && jobDealType === "insurance" && "(ACV Check Amount)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-700 border-slate-600 text-white"
                />
                {invoiceType === "deposit" && jobDealType !== "insurance" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Default: 50% of contract (${getDepositDefault()})
                  </p>
                )}
              </div>
            )}

            {/* Change Order Selection (for supplement) */}
            {invoiceType === "supplement" && (
              <div>
                <Label className="text-white">Select Change Orders to Bill</Label>
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {unbilledChangeOrders.length > 0 ? (
                    unbilledChangeOrders.map((co) => (
                      <label key={co.id} className="flex items-center gap-3 py-2 hover:bg-slate-600/50 rounded px-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedChangeOrderIds.includes(co.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChangeOrderIds([...selectedChangeOrderIds, co.id]);
                            } else {
                              setSelectedChangeOrderIds(selectedChangeOrderIds.filter(id => id !== co.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-500 bg-slate-600 text-[#00d4aa]"
                        />
                        <div className="flex-1">
                          <p className="text-white text-sm">{co.description}</p>
                          <p className="text-slate-400 text-xs">${(co.amount / 100).toFixed(2)}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No unbilled change orders available</p>
                  )}
                </div>
              </div>
            )}

            {/* Final Invoice Info */}
            {invoiceType === "final" && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  <strong>Final Invoice:</strong> Amount will be auto-calculated as (Contract + Approved Changes) - Previous Invoices
                </p>
              </div>
            )}

            {/* Due Date */}
            <div>
              <Label className="text-white">Due Date (Optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Default: 30 days from today
              </p>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-white">Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this invoice..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
            >
              {generateMutation.isPending ? "Generating..." : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
