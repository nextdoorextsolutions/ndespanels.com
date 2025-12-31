/**
 * MatchTransactionDialog Component
 * Dialog for reconciling individual transactions with option to match to bills
 */

import React, { useState, useMemo } from 'react';
import { Receipt, Tag, Briefcase, DollarSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';

interface Job {
  id: number;
  fullName: string;
}

interface Transaction {
  id: number;
  description: string;
  transactionDate: Date | string;
  amount: string;
  category?: string | null;
  status: string | null;
  projectId?: number | null;
}

interface MatchTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  categories: string[];
  jobs: Job[];
  onSave: (data: {
    category?: string;
    projectId?: number;
    billId?: number;
  }) => void;
}

export function MatchTransactionDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  jobs,
  onSave,
}: MatchTransactionDialogProps) {
  const [reconcileMode, setReconcileMode] = useState<'category' | 'bill'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined);
  const [selectedBill, setSelectedBill] = useState<number | undefined>(undefined);

  // Fetch unpaid bills
  const { data: billsData = [] } = trpc.bills.getAll.useQuery({
    status: 'pending',
  });

  // Filter bills that match the transaction amount (within $0.05)
  const matchingBills = useMemo(() => {
    if (!transaction) return [];
    
    const txAmount = Math.abs(parseFloat(transaction.amount));
    
    return billsData
      .filter(item => {
        const billAmount = parseFloat(item.bill.totalAmount);
        const diff = Math.abs(txAmount - billAmount);
        return diff <= 0.05; // Within 5 cents
      })
      .map(item => ({
        id: item.bill.id,
        vendorName: item.bill.vendorName,
        amount: item.bill.totalAmount,
        dueDate: item.bill.dueDate,
        billNumber: item.bill.billNumber,
      }));
  }, [transaction, billsData]);

  const handleSave = () => {
    if (reconcileMode === 'bill' && selectedBill) {
      onSave({ billId: selectedBill });
    } else {
      onSave({
        category: selectedCategory || undefined,
        projectId: selectedProject,
      });
    }
    onOpenChange(false);
  };

  if (!transaction) return null;

  const txAmount = parseFloat(transaction.amount);
  const isDebit = txAmount < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-cyan-400" />
            Reconcile Transaction
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {transaction.description} • ${Math.abs(txAmount).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Toggle - Only show for debit transactions */}
          {isDebit && (
            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setReconcileMode('category')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  reconcileMode === 'category'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-2" />
                Categorize
              </button>
              <button
                onClick={() => setReconcileMode('bill')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  reconcileMode === 'bill'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-4 h-4 inline mr-2" />
                Match to Bill
              </button>
            </div>
          )}

          {/* Category Mode */}
          {reconcileMode === 'category' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project (Optional)
                </label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">No project</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Bill Matching Mode */}
          {reconcileMode === 'bill' && (
            <div className="space-y-4">
              {matchingBills.length > 0 ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-purple-400" />
                    Matching Bills (${Math.abs(txAmount).toFixed(2)} ± $0.05)
                  </h4>
                  <div className="space-y-2">
                    {matchingBills.map((bill) => (
                      <label
                        key={bill.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedBill === bill.id
                            ? 'bg-purple-600/20 border border-purple-500'
                            : 'bg-slate-800 border border-slate-700 hover:border-purple-500/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bill"
                          value={bill.id}
                          checked={selectedBill === bill.id}
                          onChange={() => setSelectedBill(bill.id)}
                          className="text-purple-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{bill.vendorName}</span>
                            <span className="text-white font-mono">${parseFloat(bill.amount).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span>{bill.billNumber}</span>
                            <span>•</span>
                            <span>Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-purple-300 mt-3">
                    ✓ Matching this transaction to a bill will mark the bill as "Paid" and prevent double-entry.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
                  <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No unpaid bills match this transaction amount</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Looking for bills within $0.05 of ${Math.abs(txAmount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              reconcileMode === 'bill' 
                ? !selectedBill 
                : !selectedCategory
            }
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {reconcileMode === 'bill' ? 'Match & Mark Paid' : 'Save & Reconcile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
