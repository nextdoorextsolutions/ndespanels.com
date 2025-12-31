/**
 * TransactionList Component
 * Displays pending and reconciled transaction cards
 */

import React from 'react';
import { Check, Filter, Tag, Briefcase, Trash2, Edit2, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MONTHS } from '@/constants/banking-constants';

interface Job {
  id: number;
  fullName: string;
  address: string;
}

interface Transaction {
  transaction: {
    id: number;
    description: string;
    transactionDate: Date | string;
    amount: string;
    category?: string | null;
    status: string | null;
    projectId?: number | null;
  };
  project?: {
    id: number;
    fullName: string;
  } | null;
}

interface TransactionListProps {
  // Data
  pendingTransactions: Transaction[];
  reconciledTransactions: Transaction[];
  jobs: Job[];
  categories: string[];
  
  // State
  selectedCategory: Record<number, string>;
  selectedProject: Record<number, number | undefined>;
  editingTransactionId: number | null;
  editedDescription: string;
  
  // Handlers
  onCategoryChange: (txId: number, category: string) => void;
  onProjectChange: (txId: number, projectId: number | undefined) => void;
  onReconcile: (txId: number) => void;
  onDelete: (txId: number) => void;
  onEditTransaction: (txId: number) => void;
  onStartEdit: (txId: number, description: string) => void;
  onSaveEdit: (txId: number) => void;
  onCancelEdit: () => void;
  onDescriptionChange: (description: string) => void;
  onOpenMatchDialog: (tx: Transaction['transaction']) => void;
  
  // UI State
  selectedMonth: string;
  selectedYear: string;
  isReconciling: boolean;
}

export function TransactionList({
  pendingTransactions,
  reconciledTransactions,
  jobs,
  categories,
  selectedCategory,
  selectedProject,
  editingTransactionId,
  editedDescription,
  onCategoryChange,
  onProjectChange,
  onReconcile,
  onDelete,
  onEditTransaction,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDescriptionChange,
  onOpenMatchDialog,
  selectedMonth,
  selectedYear,
  isReconciling,
}: TransactionListProps) {
  const renderPendingTransaction = (item: Transaction) => {
    const tx = item.transaction;
    const isExpense = Number(tx.amount) < 0;
    
    return (
      <Card key={tx.id} className="bg-slate-900 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isExpense ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {isExpense ? '−' : '+'}
                </div>
                <div className="flex-1">
                  {editingTransactionId === tx.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedDescription}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        className="flex-1 bg-slate-800 border border-cyan-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => onSaveEdit(tx.id)}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white">{tx.description}</p>
                      <button
                        onClick={() => onStartEdit(tx.id, tx.description)}
                        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{new Date(tx.transactionDate).toLocaleDateString()}</p>
                </div>
                <p className={`text-xl font-bold font-mono ${
                  isExpense ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  ${Math.abs(Number(tx.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                    <Tag size={12} />
                    Category
                  </label>
                  <select
                    value={selectedCategory[tx.id] || ''}
                    onChange={(e) => onCategoryChange(tx.id, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                    <Briefcase size={12} />
                    Project (Optional)
                  </label>
                  <select
                    value={selectedProject[tx.id] || ''}
                    onChange={(e) => onProjectChange(tx.id, e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">No project</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.fullName} - {job.address}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto justify-end">
              <Button
                onClick={() => onDelete(tx.id)}
                variant="outline"
                size="sm"
                className="border-red-600 text-red-400 hover:bg-red-600/10"
              >
                <Trash2 size={16} />
              </Button>
              <Button
                onClick={() => onOpenMatchDialog(tx)}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Tag size={16} className="mr-2" />
                Reconcile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderReconciledTransaction = (item: Transaction) => {
    const tx = item.transaction;
    const isExpense = Number(tx.amount) < 0;
    
    return (
      <Card key={tx.id} className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                isExpense ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {isExpense ? '−' : '+'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{tx.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{new Date(tx.transactionDate).toLocaleDateString()}</span>
                  {tx.category && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isExpense ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {tx.category}
                    </span>
                  )}
                  {item.project && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">
                      {item.project.fullName}
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-sm font-bold font-mono ${
                isExpense ? 'text-red-400' : 'text-emerald-400'
              }`}>
                ${Math.abs(Number(tx.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <Button
                onClick={() => onEditTransaction(tx.id)}
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Edit2 size={14} className="mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pending Transactions */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Filter className="w-5 h-5 text-yellow-400" />
          Pending Transactions ({pendingTransactions.length})
        </h3>
        
        {pendingTransactions.length > 0 ? (
          pendingTransactions.map(renderPendingTransaction)
        ) : (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No pending transactions</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reconciled Transactions */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-400" />
          Reconciled Transactions ({MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear})
        </h3>
        
        {reconciledTransactions.length > 0 ? (
          reconciledTransactions.map(renderReconciledTransaction)
        ) : (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No transactions for this period</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
