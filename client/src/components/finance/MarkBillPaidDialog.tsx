import React, { useState } from 'react';
import { X, CheckCircle, Calendar, CreditCard } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface MarkBillPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: {
    id: number;
    vendorName: string;
    totalAmount: string;
    billNumber: string;
  } | null;
}

export function MarkBillPaidDialog({ open, onOpenChange, bill }: MarkBillPaidDialogProps) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [createShadowTransaction, setCreateShadowTransaction] = useState(true);

  const utils = trpc.useUtils();

  // Fetch bank accounts for account selection
  const { data: accounts = [] } = trpc.bankAccounts.getAll.useQuery({});

  const markAsPaid = trpc.bills.markAsPaid.useMutation({
    onSuccess: () => {
      utils.bills.invalidate();
    },
  });

  const createTransaction = trpc.banking.create.useMutation({
    onSuccess: () => {
      utils.banking.invalidate();
    },
  });

  const reconcileTransaction = trpc.banking.reconcile.useMutation({
    onSuccess: () => {
      utils.banking.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bill || !paymentMethod || !selectedAccount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Mark bill as paid
      await markAsPaid.mutateAsync({
        id: bill.id,
        paymentMethod,
        paymentDate,
        paymentReference: paymentReference || undefined,
      });

      // Create shadow transaction if enabled
      if (createShadowTransaction) {
        const newTransaction = await createTransaction.mutateAsync({
          transactionDate: paymentDate,
          description: `Bill Payment - ${bill.vendorName} (${bill.billNumber})`,
          amount: -parseFloat(bill.totalAmount), // Negative for expense
          category: 'bill_payment',
          bankAccount: selectedAccount,
          notes: `Shadow transaction for bill #${bill.id}. When bank statement imports, AI will auto-match this payment.`,
        });

        // Immediately reconcile the shadow transaction
        await reconcileTransaction.mutateAsync({
          id: newTransaction.id,
          category: 'bill_payment',
        });
      }

      toast.success(
        createShadowTransaction 
          ? 'Bill marked as paid and shadow transaction created' 
          : 'Bill marked as paid'
      );
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark bill as paid');
    }
  };

  const resetForm = () => {
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('');
    setSelectedAccount('');
    setPaymentReference('');
    setCreateShadowTransaction(true);
  };

  if (!open || !bill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a20] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Mark Bill as Paid</h2>
              <p className="text-sm text-zinc-400">{bill.vendorName}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="text-zinc-400" size={20} />
          </button>
        </div>

        {/* Bill Summary */}
        <div className="p-6 bg-emerald-500/5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Bill Number</p>
              <p className="text-white font-medium">{bill.billNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Amount</p>
              <p className="text-2xl font-bold text-white">
                ${parseFloat(bill.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Payment Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
              required
            />
          </div>

          {/* Payment Account */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <CreditCard size={16} />
              Paid From Account <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
              required
            >
              <option value="">Select account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.accountName}>
                  {account.accountName} ({account.accountType})
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              This helps track which account the payment came from
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Payment Method <span className="text-rose-400">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
              required
            >
              <option value="">Select method...</option>
              <option value="check">Check</option>
              <option value="ach">ACH Transfer</option>
              <option value="wire">Wire Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Payment Reference (Optional)
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Check #, confirmation #, etc."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Shadow Transaction Toggle */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createShadowTransaction}
                onChange={(e) => setCreateShadowTransaction(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Create Shadow Transaction</p>
                <p className="text-xs text-cyan-300 mt-1">
                  Recommended: Creates a transaction record in your banking ledger. When your bank statement imports later, 
                  AI will recognize this payment and auto-match it, preventing duplicate expense entries.
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={markAsPaid.isPending || createTransaction.isPending}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(markAsPaid.isPending || createTransaction.isPending) ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Mark as Paid
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
