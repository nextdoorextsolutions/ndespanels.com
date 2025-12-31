/**
 * ReconcileDialog Component
 * Dialog for bulk reconciling newly imported transactions as "Legacy"
 */

import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReconcileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionCount: number;
  onReconcile: (category: string) => void;
  onSkip: () => void;
}

export function ReconcileDialog({
  open,
  onOpenChange,
  transactionCount,
  onReconcile,
  onSkip,
}: ReconcileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-400" />
            Reconcile Imported Transactions
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            You've imported {transactionCount} transactions from your bank statement.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="text-white font-semibold">What is "Legacy"?</h4>
                <p className="text-sm text-slate-400">
                  Mark these transactions as "Legacy" to indicate they're from before you started using this CRM. 
                  You can categorize them individually later using the Quick Add feature.
                </p>
              </div>
              
              <Button
                onClick={() => onReconcile('Legacy')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Mark All {transactionCount} as Legacy & Reconcile
              </Button>
              
              <p className="text-xs text-slate-500 text-center">
                This will move all transactions from "Pending" to "Reconciled" with the Legacy category.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onSkip}
            className="border-slate-600 text-slate-300"
          >
            Skip for Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
