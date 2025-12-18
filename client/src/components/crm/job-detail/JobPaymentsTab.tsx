/**
 * JobPaymentsTab Component
 * Manual payment recording for jobs (checks, cash, wire transfers)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, Trash2, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface JobPaymentsTabProps {
  jobId: number;
  canEdit: boolean;
}

export function JobPaymentsTab({ jobId, canEdit }: JobPaymentsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<"check" | "cash" | "wire" | "credit_card" | "other">("check");
  const [checkNumber, setCheckNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch payments
  const { data: payments, refetch } = trpc.payments.getJobPayments.useQuery({ jobId });
  const { data: summary } = trpc.payments.getPaymentSummary.useQuery({ jobId });

  // Mutations
  const recordPayment = trpc.payments.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      refetch();
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  const deletePayment = trpc.payments.deletePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete payment: ${error.message}`);
    },
  });

  const resetForm = () => {
    setAmount("");
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod("check");
    setCheckNumber("");
    setNotes("");
  };

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    recordPayment.mutate({
      jobId,
      amount: amountNum,
      paymentDate,
      paymentMethod,
      checkNumber: checkNumber || undefined,
      notes: notes || undefined,
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      check: "Check",
      cash: "Cash",
      wire: "Wire Transfer",
      credit_card: "Credit Card",
      other: "Other",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#00d4aa]" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-[#00d4aa]">
                ${(summary?.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Number of Payments</p>
              <p className="text-2xl font-bold text-white">{summary?.paymentCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Payment History</CardTitle>
            {canEdit && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Record a Payment</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Record a check, cash, or wire transfer payment received for this job.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentDate">Payment Date</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="wire">Wire Transfer</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentMethod === "check" && (
                      <div className="space-y-2">
                        <Label htmlFor="checkNumber">Check Number</Label>
                        <Input
                          id="checkNumber"
                          type="text"
                          placeholder="Optional"
                          value={checkNumber}
                          onChange={(e) => setCheckNumber(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={recordPayment.isPending}
                      className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                    >
                      {recordPayment.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payments recorded yet</p>
              {canEdit && (
                <p className="text-sm mt-2">Click "Record Payment" to add the first payment</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-[#00d4aa]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          ${(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                        {payment.checkNumber && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-400 text-sm">Check #{payment.checkNumber}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-slate-400 mt-1">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this payment?")) {
                          deletePayment.mutate({ paymentId: payment.id });
                        }
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
