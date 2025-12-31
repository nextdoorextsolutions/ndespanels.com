/**
 * BankingViewEnhanced - Main Orchestrator
 * Refactored to use extracted components, hooks, and utilities
 */

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AccountManagement } from './AccountManagement';

// Constants & Types
import { 
  DEFAULT_CATEGORIES, 
  MONTHS, 
  YEARS, 
  ViewMode,
  BankAccountType,
  AI_BATCH_SIZE 
} from '@/constants/banking-constants';

// Hooks
import { useBankingMetrics } from '@/hooks/use-banking-metrics';
import { useBankingMutations } from '@/hooks/use-banking-mutations';
import { useTransactionState } from '@/hooks/use-transaction-state';

// Utils
import { parseStatement } from '@/utils/statement-parser';

// Components
import { BankingControlBar } from './banking/BankingControlBar';
import { BankingSummary } from './banking/BankingSummary';
import { AccountCards } from './banking/AccountCards';
import { TransactionList } from './banking/TransactionList';
import { ReconcileDialog } from './banking/dialogs/ReconcileDialog';
import { EditTransactionDialog } from './banking/dialogs/EditTransactionDialog';
import { QuickAddDialog } from './banking/dialogs/QuickAddDialog';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function BankingViewEnhanced() {
  // View State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('ytd');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [statementYear, setStatementYear] = useState(new Date().getFullYear().toString());
  const [statementMonth, setStatementMonth] = useState((new Date().getMonth() + 1).toString());

  // Dialog State
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);

  // Transaction State
  const [newlyImportedIds, setNewlyImportedIds] = useState<number[]>([]);
  const [editingReconciledTx, setEditingReconciledTx] = useState<any>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Data Queries
  const { data: transactions = [] } = trpc.banking.getAll.useQuery({ status: 'all' });
  const { data: jobs = [] } = trpc.crm.getLeads.useQuery({});
  const { data: accounts = [] } = trpc.bankAccounts.getAll.useQuery({});

  // Custom Hooks
  const { selectedCategory, selectedProject, setSelectedCategory, setSelectedProject } = useTransactionState();
  const { filteredTransactions, metrics } = useBankingMetrics(transactions, {
    year: selectedYear,
    month: selectedMonth,
    search: searchQuery,
    category: categoryFilter,
  });
  const { reconcile, bulkImport, deleteTransaction, bulkDelete, updateTransaction, categorizeBatch } = useBankingMutations();

  // Combined categories
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories, 'Legacy'];

  // File Upload Handlers
  const handleUpload = () => {
    document.getElementById('bank-statement-upload')?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File, year?: string, month?: string) => {
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');

    if (isPDF && (!year || !month)) {
      setPendingFile(file);
      setShowDateDialog(true);
      return;
    }

    setIsUploading(true);
    try {
      const result = await parseStatement(file, year, month);
      toast.success(`Found ${result.transactions.length} transactions in ${result.metadata.fileName}`);
      bulkImport.mutate(
        { transactions: result.transactions },
        {
          onSuccess: (data) => {
            const importedIds = data.transactions.map((t: any) => t.id);
            setNewlyImportedIds(importedIds);
            setViewMode('detailed');
            setShowReconcileDialog(true);
            setIsUploading(false);
          },
          onError: () => {
            setIsUploading(false);
          }
        }
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse file');
      setIsUploading(false);
    }
  };

  const handleDateConfirm = () => {
    if (pendingFile) {
      setShowDateDialog(false);
      processFile(pendingFile, statementYear, statementMonth);
      setPendingFile(null);
    }
  };

  // Transaction Handlers
  const handleReconcile = (txId: number) => {
    const category = selectedCategory[txId];
    const projectId = selectedProject[txId];

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    reconcile.mutate({ id: txId, category, projectId });
  };

  const handleDelete = (txId: number) => {
    setDeleteTransactionId(txId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteTransactionId) {
      deleteTransaction.mutate({ id: deleteTransactionId });
      setShowDeleteDialog(false);
      setDeleteTransactionId(null);
    }
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    const year = parseInt(selectedYear);
    const month = selectedMonth !== 'all' && selectedMonth !== 'ytd' ? parseInt(selectedMonth) : undefined;
    bulkDelete.mutate({ year, month });
    setShowBulkDeleteDialog(false);
  };

  const bulkReconcileImported = (category: string) => {
    let completed = 0;
    newlyImportedIds.forEach(id => {
      reconcile.mutate(
        { id, category },
        {
          onSuccess: () => {
            completed++;
            if (completed === newlyImportedIds.length) {
              toast.success(`Reconciled ${newlyImportedIds.length} transactions as ${category}`);
            }
          },
        }
      );
    });
    setShowReconcileDialog(false);
    setNewlyImportedIds([]);
  };

  const startEditingDescription = (txId: number, description: string) => {
    setEditingTransactionId(txId);
    setEditedDescription(description);
  };

  const saveDescription = (txId: number) => {
    updateTransaction.mutate(
      { id: txId, description: editedDescription },
      {
        onSuccess: () => {
          setEditingTransactionId(null);
          setEditedDescription('');
        }
      }
    );
  };

  const cancelEdit = () => {
    setEditingTransactionId(null);
    setEditedDescription('');
  };

  const handleEditReconciledTransaction = (txId: number) => {
    const item = filteredTransactions.find(t => t.transaction.id === txId);
    if (item) {
      setEditingReconciledTx(item);
      setSelectedCategory({ ...selectedCategory, [txId]: item.transaction.category || '' });
      setSelectedProject({ ...selectedProject, [txId]: item.project?.id || undefined });
      setShowEditDialog(true);
    }
  };

  const saveEditedTransaction = () => {
    if (editingReconciledTx) {
      const txId = editingReconciledTx.transaction.id;
      const category = selectedCategory[txId];
      const projectId = selectedProject[txId];
      
      if (category) {
        reconcile.mutate(
          { id: txId, category, projectId },
          {
            onSuccess: () => {
              setShowEditDialog(false);
              setEditingReconciledTx(null);
            }
          }
        );
      }
    }
  };

  // Filtered transaction lists
  const pendingTransactions = transactions.filter(t => t.transaction.status === 'pending');
  const reconciledTransactions = filteredTransactions.filter(t => t.transaction.status === 'reconciled');

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Banking & Statements</h2>
            <p className="text-slate-400">Manage and analyze your financial transactions</p>
          </div>
        </div>

        {/* Year & Month Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-cyan-500 text-white"
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-cyan-500 text-white"
          >
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>

        {/* Control Bar */}
        <BankingControlBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          categories={allCategories}
          isUploading={isUploading}
          isDragging={isDragging}
          onUploadClick={handleUpload}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileChange={handleFileUpload}
          onAICategorize={() => categorizeBatch.mutate({ limit: AI_BATCH_SIZE, recategorize: true })}
          isAICategorizing={categorizeBatch.isPending}
          onBulkDelete={handleBulkDelete}
          onQuickAdd={() => setShowQuickAddDialog(true)}
          showBulkDelete={filteredTransactions.length > 0 && selectedMonth !== 'all' && selectedMonth !== 'ytd'}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        {/* View Mode Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          {(['summary', 'detailed', 'accounts'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Summary View */}
        {viewMode === 'summary' && (
          <BankingSummary
            metrics={metrics}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}

        {/* Detailed View */}
        {viewMode === 'detailed' && (
          <TransactionList
            pendingTransactions={pendingTransactions}
            reconciledTransactions={reconciledTransactions}
            jobs={jobs}
            categories={allCategories}
            selectedCategory={selectedCategory}
            selectedProject={selectedProject}
            editingTransactionId={editingTransactionId}
            editedDescription={editedDescription}
            onCategoryChange={(txId, category) => setSelectedCategory({ ...selectedCategory, [txId]: category })}
            onProjectChange={(txId, projectId) => setSelectedProject({ ...selectedProject, [txId]: projectId })}
            onReconcile={handleReconcile}
            onDelete={handleDelete}
            onEditTransaction={handleEditReconciledTransaction}
            onStartEdit={startEditingDescription}
            onSaveEdit={saveDescription}
            onCancelEdit={cancelEdit}
            onDescriptionChange={setEditedDescription}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            isReconciling={reconcile.isPending}
          />
        )}

        {/* Accounts View */}
        {viewMode === 'accounts' && (
          <div className="space-y-6">
            <AccountManagement />
            <AccountCards accounts={accounts} />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ReconcileDialog
        open={showReconcileDialog}
        onOpenChange={setShowReconcileDialog}
        transactionCount={newlyImportedIds.length}
        onReconcile={bulkReconcileImported}
        onSkip={() => {
          setShowReconcileDialog(false);
          setNewlyImportedIds([]);
        }}
      />

      <EditTransactionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        transaction={editingReconciledTx}
        selectedCategory={editingReconciledTx ? selectedCategory[editingReconciledTx.transaction.id] || '' : ''}
        selectedProject={editingReconciledTx ? selectedProject[editingReconciledTx.transaction.id] : undefined}
        categories={allCategories}
        jobs={jobs}
        onCategoryChange={(category) => {
          if (editingReconciledTx) {
            setSelectedCategory({ ...selectedCategory, [editingReconciledTx.transaction.id]: category });
          }
        }}
        onProjectChange={(projectId) => {
          if (editingReconciledTx) {
            setSelectedProject({ ...selectedProject, [editingReconciledTx.transaction.id]: projectId });
          }
        }}
        onSave={saveEditedTransaction}
        onCancel={() => {
          setShowEditDialog(false);
          setEditingReconciledTx(null);
        }}
        isSaving={reconcile.isPending}
      />

      <QuickAddDialog
        open={showQuickAddDialog}
        onOpenChange={setShowQuickAddDialog}
        transactions={transactions}
        categories={allCategories}
        jobs={jobs}
        onCategoryChange={(txId, category) => setSelectedCategory({ ...selectedCategory, [txId]: category })}
        onProjectChange={(txId, projectId) => setSelectedProject({ ...selectedProject, [txId]: projectId })}
      />

      {/* PDF Date Dialog */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Select Statement Period
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              PDF statements require you to specify the month and year
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Year</label>
              <select
                value={statementYear}
                onChange={(e) => setStatementYear(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Month</label>
              <select
                value={statementMonth}
                onChange={(e) => setStatementMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
              >
                {MONTHS.filter(m => m.value !== 'all' && m.value !== 'ytd').map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDateConfirm} className="bg-purple-600 hover:bg-purple-700">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Transaction</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Bulk Delete Transactions</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete all {filteredTransactions.length} transactions from {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
