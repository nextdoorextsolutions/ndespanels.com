/**
 * QuickAddDialog Component
 * Dialog for bulk categorizing transactions by description patterns
 */

import React from 'react';
import { BookOpen, Tag } from 'lucide-react';
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
  };
}

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  categories: string[];
  jobs: Job[];
  onCategoryChange: (txId: number, category: string) => void;
  onProjectChange: (txId: number, projectId: number | undefined) => void;
}

export function QuickAddDialog({
  open,
  onOpenChange,
  transactions,
  categories,
  jobs,
  onCategoryChange,
  onProjectChange,
}: QuickAddDialogProps) {
  // Group transactions by similar descriptions
  const groupedTransactions = Object.entries(
    transactions.reduce((acc, item) => {
      const desc = item.transaction.description;
      const key = desc.substring(0, 10); // Group by first 10 chars
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, Transaction[]>)
  )
    .filter(([_, items]) => items.length > 1) // Only show patterns with multiple transactions
    .slice(0, 10); // Limit to top 10 patterns

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Quick Add Categories & Projects
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Quickly categorize and assign projects to multiple transactions based on description patterns.
            Perfect for bulk updates and recurring transaction types.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              Quick Category Assignment
            </h4>
            <p className="text-sm text-slate-400 mb-3">
              Select transactions by description pattern and assign categories/projects in bulk:
            </p>
            
            <div className="space-y-3">
              {groupedTransactions.map(([pattern, items]) => {
                const sampleTx = items[0].transaction;
                const count = items.length;
                
                return (
                  <div key={pattern} className="bg-slate-900 border border-slate-600 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-white font-medium">{sampleTx.description}</p>
                        <p className="text-xs text-slate-500">{count} transactions</p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          onChange={(e) => {
                            if (e.target.value) {
                              items.forEach(item => onCategoryChange(item.transaction.id, e.target.value));
                            }
                          }}
                        >
                          <option value="">Category...</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <select
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          onChange={(e) => {
                            const projectId = e.target.value ? Number(e.target.value) : undefined;
                            items.forEach(item => onProjectChange(item.transaction.id, projectId));
                          }}
                        >
                          <option value="">Project...</option>
                          {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                              {job.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <p className="text-sm text-cyan-300">
              <strong>Tip:</strong> Use the dropdowns above to quickly assign categories and projects to all transactions with similar descriptions. 
              This is perfect for recurring vendors or transaction types.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
