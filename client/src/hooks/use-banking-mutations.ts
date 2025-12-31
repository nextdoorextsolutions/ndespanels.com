/**
 * Banking Mutations Hook
 * Wraps all tRPC mutations for banking operations
 */

import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function useBankingMutations() {
  const utils = trpc.useUtils();

  const reconcile = trpc.banking.reconcile.useMutation({
    onSuccess: () => {
      toast.success('Transaction reconciled');
      utils.banking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reconcile transaction');
    },
  });

  const bulkImport = trpc.banking.bulkImport.useMutation({
    onSuccess: (data) => {
      console.log('[bulkImport SUCCESS]', data);
      toast.success(`Successfully imported ${data.count} transactions`);
      utils.banking.invalidate();
    },
    onError: (error) => {
      console.error('[bulkImport ERROR]', error);
      toast.error(error.message || 'Failed to import transactions');
    },
  });

  const deleteTransaction = trpc.banking.delete.useMutation({
    onSuccess: () => {
      toast.success('Transaction deleted');
      utils.banking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete transaction');
    },
  });

  const bulkDelete = trpc.banking.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.count} transactions`);
      utils.banking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete transactions');
    },
  });

  const updateTransaction = trpc.banking.update.useMutation({
    onSuccess: () => {
      toast.success('Transaction updated');
      utils.banking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update transaction');
    },
  });

  const categorizeBatch = trpc.banking.categorizeBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`AI categorized ${data.categorized} transactions!`);
      utils.banking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to categorize transactions');
    },
  });

  return {
    reconcile,
    bulkImport,
    deleteTransaction,
    bulkDelete,
    updateTransaction,
    categorizeBatch,
    utils,
  };
}
