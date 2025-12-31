/**
 * ReconcileDialog Component
 * Dialog for bulk reconciling newly imported transactions as "Legacy" or using AI
 */

import React from 'react';
import { FileSpreadsheet, Sparkles } from 'lucide-react';
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
  onAIReconcile: () => void;
  onSkip: () => void;
  isAIProcessing?: boolean;
}

export function ReconcileDialog({
  open,
  onOpenChange,
  transactionCount,
  onReconcile,
  onAIReconcile,
  onSkip,
  isAIProcessing = false,
}: ReconcileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
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
          {/* AI Reconcile Option */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-white font-semibold">AI Auto-Categorize & Reconcile (Recommended)</h4>
                  <p className="text-sm text-slate-400">
                    Let AI analyze and categorize all {transactionCount} transactions automatically using Gemini AI. 
                    Each transaction will be intelligently categorized and marked as reconciled.
                  </p>
                </div>
              </div>
              
              <Button
                onClick={onAIReconcile}
                disabled={isAIProcessing}
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
              >
                {isAIProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Processing {transactionCount} transactions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Reconcile All {transactionCount} Transactions
                  </>
                )}
              </Button>
              
              <p className="text-xs text-slate-500 text-center">
                AI will categorize and reconcile all transactions in one batch. This may take a moment.
              </p>
            </div>
          </div>

          {/* Legacy Option */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="text-white font-semibold">Manual: Mark as "Legacy"</h4>
                <p className="text-sm text-slate-400">
                  Mark these transactions as "Legacy" to indicate they're from before you started using this CRM. 
                  You can categorize them individually later using the Quick Add feature.
                </p>
              </div>
              
              <Button
                onClick={() => onReconcile('Legacy')}
                disabled={isAIProcessing}
                variant="outline"
                className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/10"
              >
                Mark All {transactionCount} as Legacy & Reconcile
              </Button>
              
              <p className="text-xs text-slate-500 text-center">
                This will move all transactions to "Reconciled" with the Legacy category.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isAIProcessing}
            className="border-slate-600 text-slate-300"
          >
            Skip for Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
