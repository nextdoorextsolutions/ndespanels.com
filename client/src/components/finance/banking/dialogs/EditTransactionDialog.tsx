/**
 * EditTransactionDialog Component
 * Dialog for editing reconciled transactions (category and project)
 */

import React from 'react';
import { Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Job {
  id: number;
  fullName: string;
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

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  selectedCategory: string;
  selectedProject: number | undefined;
  categories: string[];
  jobs: Job[];
  onCategoryChange: (category: string) => void;
  onProjectChange: (projectId: number | undefined) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  selectedCategory,
  selectedProject,
  categories,
  jobs,
  onCategoryChange,
  onProjectChange,
  onSave,
  onCancel,
  isSaving,
}: EditTransactionDialogProps) {
  if (!transaction) return null;

  const tx = transaction.transaction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-cyan-400" />
            Edit Transaction
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Update the category or project for this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-white mb-1">
              {tx.description}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(tx.transactionDate).toLocaleDateString()} • 
              ${Math.abs(Number(tx.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Project (Optional)</label>
            <select
              value={selectedProject || ''}
              onChange={(e) => onProjectChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
            >
              <option value="">No project</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.fullName}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-slate-600 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!selectedCategory || isSaving}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
