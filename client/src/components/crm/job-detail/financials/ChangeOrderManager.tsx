/**
 * ChangeOrderManager Component
 * Manages change orders with tabbed view (Pending/Approved/Rejected)
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle, XCircle, DollarSign, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ChangeOrderManagerProps {
  jobId: number;
  onBillChangeOrder: (changeOrderId: number) => void; // Callback to open invoice modal with pre-selected supplement
}

type TabType = "pending" | "approved" | "rejected";

export function ChangeOrderManager({ jobId, onBillChangeOrder }: ChangeOrderManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedChangeOrder, setSelectedChangeOrder] = useState<any>(null);

  // Form state
  const [type, setType] = useState<"supplement" | "retail_change" | "insurance_supplement">("retail_change");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = trpc.useUtils();

  // Fetch change orders
  const { data: changeOrders = [] } = trpc.changeOrders.getJobChangeOrders.useQuery({ jobId });

  // Mutations
  const createMutation = trpc.changeOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Change order created");
      setShowAddDialog(false);
      resetForm();
      // Invalidate to refresh FinancialLedger
      utils.changeOrders.getJobChangeOrders.invalidate({ jobId });
      utils.changeOrders.getJobSummary.invalidate({ jobId });
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const approveMutation = trpc.changeOrders.approve.useMutation({
    onSuccess: () => {
      toast.success("Change order approved");
      setShowApproveDialog(false);
      setSelectedChangeOrder(null);
      setApprovalNotes("");
      // Invalidate to refresh FinancialLedger
      utils.changeOrders.getJobChangeOrders.invalidate({ jobId });
      utils.changeOrders.getJobSummary.invalidate({ jobId });
      utils.changeOrders.getUnbilledChangeOrders.invalidate({ jobId });
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.changeOrders.reject.useMutation({
    onSuccess: () => {
      toast.success("Change order rejected");
      setShowRejectDialog(false);
      setSelectedChangeOrder(null);
      setRejectionReason("");
      utils.changeOrders.getJobChangeOrders.invalidate({ jobId });
      utils.changeOrders.getJobSummary.invalidate({ jobId });
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const deleteMutation = trpc.changeOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Change order deleted");
      utils.changeOrders.getJobChangeOrders.invalidate({ jobId });
      utils.changeOrders.getJobSummary.invalidate({ jobId });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const resetForm = () => {
    setType("retail_change");
    setDescription("");
    setAmount("");
  };

  const handleCreate = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    createMutation.mutate({
      jobId,
      type,
      description,
      amount: amountNum,
    });
  };

  const handleApprove = () => {
    if (!selectedChangeOrder) return;
    approveMutation.mutate({
      id: selectedChangeOrder.id,
      notes: approvalNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedChangeOrder) return;
    rejectMutation.mutate({
      id: selectedChangeOrder.id,
      reason: rejectionReason || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this change order?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Filter change orders by tab
  const filteredOrders = changeOrders.filter(co => co.status === activeTab);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      supplement: "Supplement",
      retail_change: "Retail Change",
      insurance_supplement: "Insurance Supplement",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      supplement: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      retail_change: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      insurance_supplement: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    };
    return colors[type] || "bg-slate-500/10 text-slate-400 border-slate-500/30";
  };

  return (
    <Card className="glass-card bg-slate-800/60 border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Change Orders</h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Change Order
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {(["pending", "approved", "rejected"] as TabType[]).map((tab) => {
          const count = changeOrders.filter(co => co.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors capitalize ${
                activeTab === tab
                  ? "text-[#00d4aa] border-b-2 border-[#00d4aa]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Description</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Created</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((co) => {
                const amount = co.amount / 100;
                const isUnbilled = co.status === "approved" && !co.invoiceId;
                
                return (
                  <tr key={co.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getTypeBadgeColor(co.type)}`}>
                        {getTypeLabel(co.type)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white">{co.description}</td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-white">
                      ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-400">
                      {formatDistanceToNow(new Date(co.createdAt), { addSuffix: true })}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedChangeOrder(co);
                                setShowApproveDialog(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedChangeOrder(co);
                                setShowRejectDialog(true);
                              }}
                              className="border-red-600 text-red-400 hover:bg-red-600/10"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {activeTab === "approved" && isUnbilled && (
                          <Button
                            size="sm"
                            onClick={() => onBillChangeOrder(co.id)}
                            className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Bill This
                          </Button>
                        )}
                        
                        {activeTab === "approved" && co.invoiceId && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Billed
                          </span>
                        )}
                        
                        {!co.invoiceId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(co.id)}
                            className="text-slate-400 hover:text-red-400"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  No {activeTab} change orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Change Order Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Change Order</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new change order for this job
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="retail_change">Retail Change</SelectItem>
                  <SelectItem value="supplement">Supplement</SelectItem>
                  <SelectItem value="insurance_supplement">Insurance Supplement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the change..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label className="text-white">Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Change Order</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedChangeOrder && (
                <>
                  {selectedChangeOrder.description} - ${(selectedChangeOrder.amount / 100).toFixed(2)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Label className="text-white">Approval Notes (Optional)</Label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Change Order</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedChangeOrder && (
                <>
                  {selectedChangeOrder.description} - ${(selectedChangeOrder.amount / 100).toFixed(2)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Label className="text-white">Rejection Reason (Optional)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Why is this being rejected..."
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
