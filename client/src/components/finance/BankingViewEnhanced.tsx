import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  Search, 
  Tag, 
  Briefcase, 
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  List,
  Filter,
  CreditCard,
  Wallet,
  Building2,
  Trash2,
  AlertTriangle,
  Edit2,
  Save,
  X,
  BookOpen,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AccountManagement } from './AccountManagement';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_CATEGORIES = ['Materials', 'Labor', 'Fuel', 'Permit Fees', 'Marketing', 'Rent', 'Insurance', 'Miscellaneous', 'Income'];

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: 'ytd', label: 'Year to Date' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS = ['2024', '2025', '2026', '2027'];

type ViewMode = 'summary' | 'detailed' | 'category' | 'monthly' | 'accounts';

interface BankAccountType {
  id: number;
  accountName: string;
  accountType: string;
  accountNumberLast4?: string | null;
  institutionName?: string | null;
  creditLimit?: string | null;
  currentBalance?: string | null;
  notes?: string | null;
  isActive?: boolean | null;
}

export function BankingViewEnhanced() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Record<number, string>>({});
  const [selectedProject, setSelectedProject] = useState<Record<number, number | undefined>>({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('ytd');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [statementYear, setStatementYear] = useState(new Date().getFullYear().toString());
  const [statementMonth, setStatementMonth] = useState((new Date().getMonth() + 1).toString());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [newlyImportedIds, setNewlyImportedIds] = useState<number[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  const { data: transactions = [], isLoading } = trpc.banking.getAll.useQuery({ status: 'all' });
  const { data: transactionCount } = trpc.banking.getCount.useQuery();
  const { data: jobs = [] } = trpc.crm.getLeads.useQuery({});
  const { data: accounts = [] } = trpc.bankAccounts.getAll.useQuery({});
  const { data: accountStats } = trpc.bankAccounts.getStats.useQuery();
  const utils = trpc.useUtils();

  // Combine default and custom categories
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories, 'Legacy'];

  // Debug logging
  console.log('[BankingView] Transactions loaded:', transactions.length);
  console.log('[BankingView] Transaction count from DB:', transactionCount?.count);

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
      setIsUploading(false);
      // Store newly imported transaction IDs and show reconcile dialog
      const importedIds = data.transactions.map((t: any) => t.id);
      setNewlyImportedIds(importedIds);
      setViewMode('detailed');
      setShowReconcileDialog(true);
    },
    onError: (error) => {
      console.error('[bulkImport ERROR]', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(`Import failed: ${error.message || 'Unknown error'}`);
      setIsUploading(false);
    },
  });

  const deleteTransaction = trpc.banking.delete.useMutation({
    onSuccess: () => {
      toast.success('Transaction deleted');
      utils.banking.invalidate();
      setShowDeleteDialog(false);
      setDeleteTransactionId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete transaction');
    },
  });

  const bulkDelete = trpc.banking.bulkDelete.useMutation({
    onSuccess: (data: { count: number }) => {
      toast.success(`Deleted ${data.count} transactions`);
      utils.banking.invalidate();
      setShowBulkDeleteDialog(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete transactions');
    },
  });

  const updateTransaction = trpc.banking.update.useMutation({
    onSuccess: () => {
      toast.success('Transaction updated');
      utils.banking.invalidate();
      setEditingTransactionId(null);
      setEditedDescription('');
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

  // Filter transactions by year, month, and search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const tx = item.transaction;
      const txDate = new Date(tx.transactionDate);
      const txYear = txDate.getFullYear().toString();
      const txMonth = (txDate.getMonth() + 1).toString();
      
      const matchesYear = txYear === selectedYear;
      
      // Handle different month filter modes
      let matchesMonth = true;
      if (selectedMonth === 'all') {
        matchesMonth = true; // Show all months
      } else if (selectedMonth === 'ytd') {
        // Year to date: show all transactions from Jan 1 to today of selected year
        const today = new Date();
        const currentYear = today.getFullYear().toString();
        if (txYear === currentYear) {
          matchesMonth = txDate <= today;
        } else {
          matchesMonth = false;
        }
      } else {
        matchesMonth = txMonth === selectedMonth;
      }
      
      const matchesSearch = searchQuery === '' || 
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesYear && matchesMonth && matchesSearch;
    });
  }, [transactions, selectedYear, selectedMonth, searchQuery]);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const income = filteredTransactions
      .filter(t => Number(t.transaction.amount) > 0)
      .reduce((sum, t) => sum + Number(t.transaction.amount), 0);
    
    const expenses = filteredTransactions
      .filter(t => Number(t.transaction.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.transaction.amount)), 0);
    
    const netCashFlow = income - expenses;
    
    const categoryBreakdown = filteredTransactions.reduce((acc, item) => {
      const category = item.transaction.category || 'Uncategorized';
      const amount = Math.abs(Number(item.transaction.amount));
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    const pending = transactions.filter(t => t.transaction.status === 'pending').length;
    const reconciled = transactions.filter(t => t.transaction.status === 'reconciled').length;

    return {
      income,
      expenses,
      netCashFlow,
      categoryBreakdown,
      pending,
      reconciled,
      totalTransactions: filteredTransactions.length,
    };
  }, [filteredTransactions, transactions]);

  const handleReconcile = (txId: number) => {
    const category = selectedCategory[txId];
    const projectId = selectedProject[txId];

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    reconcile.mutate({
      id: txId,
      category,
      projectId,
    });
  };

  const handleDelete = (txId: number) => {
    setDeleteTransactionId(txId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteTransactionId) {
      deleteTransaction.mutate({ id: deleteTransactionId });
    }
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    const year = parseInt(selectedYear);
    const month = selectedMonth === 'ytd' || selectedMonth === 'all' ? undefined : parseInt(selectedMonth);
    
    bulkDelete.mutate({ year, month });
  };

  const startEditingDescription = (txId: number, currentDescription: string) => {
    setEditingTransactionId(txId);
    setEditedDescription(currentDescription);
  };

  const saveDescription = (txId: number) => {
    if (!editedDescription.trim()) {
      toast.error('Description cannot be empty');
      return;
    }
    updateTransaction.mutate({ id: txId, description: editedDescription });
  };

  const cancelEdit = () => {
    setEditingTransactionId(null);
    setEditedDescription('');
  };

  const updateCategory = (txId: number, category: string) => {
    updateTransaction.mutate({ id: txId, category });
  };

  const updateProject = (txId: number, projectId: number | undefined) => {
    updateTransaction.mutate({ id: txId, projectId });
  };

  const addCustomCategory = () => {
    if (newCategoryInput.trim() && !allCategories.includes(newCategoryInput.trim())) {
      setCustomCategories([...customCategories, newCategoryInput.trim()]);
      setNewCategoryInput('');
      setShowAddCategoryInput(false);
      toast.success(`Category "${newCategoryInput.trim()}" added`);
    } else if (allCategories.includes(newCategoryInput.trim())) {
      toast.error('Category already exists');
    }
  };

  const bulkReconcileImported = (category: string) => {
    // Update all newly imported transactions with category and reconciled status
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

  const processFile = (file: File, year?: string, month?: string) => {
    const fileName = file.name.toLowerCase();
    console.log('Processing file:', file.name, '| Lowercase:', fileName);
    
    const isCSV = fileName.endsWith('.csv');
    const isPDF = fileName.endsWith('.pdf');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    console.log('File type detection:', { isCSV, isPDF, isExcel });

    if (!isCSV && !isPDF && !isExcel) {
      console.log('File rejected - extension not recognized');
      toast.error(`File "${file.name}" not recognized. Please upload a CSV, Excel, or PDF file.`);
      return;
    }

    // For PDF files, ask for month/year if not provided
    if (isPDF && (!year || !month)) {
      setPendingFile(file);
      setShowDateDialog(true);
      return;
    }

    setIsUploading(true);

    if (isCSV || isExcel) {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            toast.error('CSV file is empty or invalid');
            setIsUploading(false);
            return;
          }
          
          console.log('CSV lines:', lines.length);
          console.log('First line (header):', lines[0]);
          console.log('Second line (sample):', lines[1]);
          
          // Parse header to find column indices
          const header = lines[0].toLowerCase();
          const headerCols = header.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          
          console.log('Header columns:', headerCols);
          
          // Find column indices (Chase CSV has: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #)
          // Note: "Description" column has merchant names, "Details" column has transaction type (DEBIT/CREDIT)
          const dateIdx = headerCols.findIndex(h => h.includes('date') || h.includes('posting'));
          const descIdx = headerCols.findIndex(h => h.includes('description')); // Only match "description", not "details"
          const amountIdx = headerCols.findIndex(h => h.includes('amount'));
          
          console.log('Column indices - Date:', dateIdx, 'Description:', descIdx, 'Amount:', amountIdx);
          console.log('Sample data row:', lines[1]);
          
          // Parse transactions
          const transactions = lines.slice(1).map((line, idx) => {
            try {
              // Handle CSV with quoted fields
              const cols: string[] = [];
              let current = '';
              let inQuotes = false;
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  cols.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              cols.push(current.trim());
              
              const date = cols[dateIdx] || '';
              const description = cols[descIdx] || 'Unknown Transaction';
              const amountStr = cols[amountIdx] || '0';
              
              // Parse date from MM/DD/YYYY to YYYY-MM-DD
              let parsedDate = date;
              if (date && date.includes('/')) {
                const dateParts = date.split('/');
                if (dateParts.length === 3) {
                  const [month, day, year] = dateParts;
                  parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
              
              // Parse amount (remove $ and commas)
              const amount = parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
              
              return {
                transactionDate: parsedDate,
                description: description.replace(/^"|"$/g, ''),
                amount: amount,
                bankAccount: 'Chase Business Checking',
                referenceNumber: undefined,
              };
            } catch (err) {
              console.error('Error parsing line', idx, ':', err);
              return null;
            }
          }).filter((t): t is { transactionDate: string; description: string; amount: number; bankAccount: string; referenceNumber: undefined } => t !== null && t.amount !== 0);

          console.log('Parsed transactions:', transactions.length);
          console.log('Sample dates:', transactions.slice(0, 3).map(t => t.transactionDate));
          console.log('Sample transactions:', transactions.slice(0, 3));
          
          if (transactions.length === 0) {
            toast.error('No valid transactions found in CSV. Check console for details.');
            setIsUploading(false);
            return;
          }

          console.log('[CLIENT] About to call bulkImport with', transactions.length, 'transactions');
          // Import silently, success toast will show after mutation completes
          bulkImport.mutate({ transactions });
        } catch (error) {
          console.error('CSV parsing error:', error);
          toast.error('Failed to parse CSV file. Check console for details.');
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
        setIsUploading(false);
      };

      reader.readAsText(file);
    } else if (isPDF) {
      toast.info('PDF parsing: Extracting transactions...');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Extract text from PDF - PDFs contain binary data with text streams
          // We'll look for text patterns in the binary data
          const uint8Array = new Uint8Array(arrayBuffer);
          let text = '';
          
          // Try to extract readable text from PDF binary
          for (let i = 0; i < uint8Array.length; i++) {
            const char = uint8Array[i];
            // Only include printable ASCII characters and common whitespace
            if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
              text += String.fromCharCode(char);
            }
          }
          
          console.log('Extracted text length:', text.length);
          console.log('First 500 chars:', text.substring(0, 500));
          
          const lines = text.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.length > 0);
          const transactions: any[] = [];
          
          // More flexible pattern matching for Chase statements
          // Pattern 1: Date at start with amount at end
          const pattern1 = /(\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/;
          // Pattern 2: Date followed by text with amount somewhere
          const pattern2 = /(\d{2}\/\d{2})\s+(.+?)([\d,]+\.\d{2})/;
          
          let isDepositsSection = false;
          let isChecksSection = false;
          
          console.log('Total lines to parse:', lines.length);
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Track sections
            if (line.includes('DEPOSITS') && line.includes('ADDITIONS')) {
              isDepositsSection = true;
              isChecksSection = false;
              console.log('Found DEPOSITS section at line', i);
              continue;
            }
            if (line.includes('CHECKS') && line.includes('PAID')) {
              isDepositsSection = false;
              isChecksSection = true;
              console.log('Found CHECKS section at line', i);
              continue;
            }
            if (line.includes('Total Deposits') || line.includes('Total Checks')) {
              isDepositsSection = false;
              isChecksSection = false;
              continue;
            }
            
            // Skip if not in a transaction section
            if (!isDepositsSection && !isChecksSection) continue;
            
            // Try both patterns
            let match = line.match(pattern1) || line.match(pattern2);
            
            if (match) {
              const [, dateStr, description, amountStr] = match;
              const amount = parseFloat(amountStr.replace(/,/g, ''));
              
              if (amount > 0 && dateStr.match(/^\d{2}\/\d{2}$/)) {
                const [monthPart, day] = dateStr.split('/');
                const fullDate = `${year}-${monthPart.padStart(2, '0')}-${day.padStart(2, '0')}`;
                
                transactions.push({
                  transactionDate: fullDate,
                  description: description.trim().substring(0, 200), // Limit description length
                  amount: isChecksSection ? -amount : amount,
                  bankAccount: 'Chase Business Checking',
                  referenceNumber: undefined,
                });
                
                console.log('Found transaction:', { date: fullDate, desc: description.substring(0, 50), amount });
              }
            }
          }
          
          console.log('Total transactions found:', transactions.length);
          
          if (transactions.length === 0) {
            toast.error('No valid transactions found in PDF. Please check the format or try CSV.');
            setIsUploading(false);
            return;
          }
          
          toast.success(`Extracted ${transactions.length} transactions from ${MONTHS.find(m => m.value === month)?.label} ${year}`);
          bulkImport.mutate({ transactions });
        } catch (error) {
          console.error('PDF parsing error:', error);
          toast.error('Failed to parse PDF file. Please try again or use CSV format.');
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read PDF file');
        setIsUploading(false);
      };
      
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDateConfirm = () => {
    if (pendingFile) {
      setShowDateDialog(false);
      processFile(pendingFile, statementYear, statementMonth);
      setPendingFile(null);
    }
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDialogCancel = () => {
    setShowDateDialog(false);
    setPendingFile(null);
    setIsUploading(false);
  };

  const handleUpload = () => {
    document.getElementById('bank-statement-upload')?.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading transactions...</div>
      </div>
    );
  }

  return (
    <>
      {/* Month/Year Selection Dialog for PDF Upload */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Select Statement Period</DialogTitle>
            <DialogDescription className="text-slate-400">
              Which month and year does this bank statement belong to?
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Month</label>
              <Select value={statementMonth} onValueChange={setStatementMonth}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value} className="text-white">
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Year</label>
              <Select value={statementYear} onValueChange={setStatementYear}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year} className="text-white">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDialogCancel}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDateConfirm}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Import Transactions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6 space-y-6">
        {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            Banking & Statements
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
              v2.1
            </span>
          </h2>
          <p className="text-slate-400 mt-1">Manage and analyze your financial transactions</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
          >
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search transactions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 text-white w-64" 
            />
          </div>

          {/* Hidden File Input */}
          <input
            id="bank-statement-upload"
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Upload Button with Drag & Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative transition-all ${
              isDragging ? 'scale-105' : ''
            }`}
          >
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className={`bg-purple-600 hover:bg-purple-700 transition-all ${
                isDragging ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900' : ''
              }`}
            >
              <Upload size={16} className="mr-2" />
              {isUploading ? 'Uploading...' : isDragging ? 'Drop File Here' : 'Upload Statement'}
            </Button>
            {isDragging && (
              <div className="absolute inset-0 border-2 border-dashed border-purple-400 rounded-lg pointer-events-none" />
            )}
          </div>

          {/* Bulk Delete Button */}
          {filteredTransactions.length > 0 && selectedMonth !== 'all' && selectedMonth !== 'ytd' && (
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600/10"
            >
              <Trash2 size={16} className="mr-2" />
              Delete {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </Button>
          )}

          {/* Quick Add Button */}
          <Button
            onClick={() => setShowQuickAddDialog(true)}
            variant="outline"
            className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/10"
          >
            <BookOpen size={16} className="mr-2" />
            Quick Add
          </Button>

          {/* AI Categorize Button */}
          <Button
            onClick={() => categorizeBatch.mutate({ limit: 50 })}
            disabled={categorizeBatch.isPending}
            variant="outline"
            className="border-purple-600 text-purple-400 hover:bg-purple-600/10"
          >
            <Sparkles size={16} className="mr-2" />
            {categorizeBatch.isPending ? 'Categorizing...' : 'AI Categorize'}
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
        <button
          onClick={() => setViewMode('accounts')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            viewMode === 'accounts' 
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet size={16} />
          Accounts
        </button>
        <button
          onClick={() => setViewMode('summary')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            viewMode === 'summary' 
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 size={16} />
          Summary
        </button>
        <button
          onClick={() => setViewMode('detailed')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            viewMode === 'detailed' 
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <List size={16} />
          Detailed
        </button>
        <button
          onClick={() => setViewMode('category')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            viewMode === 'category' 
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart size={16} />
          By Category
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            viewMode === 'monthly' 
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar size={16} />
          Monthly Trends
        </button>
      </div>

      {/* Accounts View */}
      {viewMode === 'accounts' && (
        <div className="space-y-6">
          {/* Account Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-cyan-500/10 rounded-xl">
                    <Building2 className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Bank Accounts</p>
                    <p className="text-2xl font-bold text-white">
                      {(accountStats?.byType?.checking || 0) + (accountStats?.byType?.savings || 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400">Total Balance</p>
                  <p className="text-lg font-bold text-emerald-400">
                    ${accounts
                      .filter((a: BankAccountType) => a.accountType === 'checking' || a.accountType === 'savings')
                      .reduce((sum: number, a: BankAccountType) => sum + Number(a.currentBalance || 0), 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/30 to-slate-800 border-purple-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <CreditCard className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Credit Cards</p>
                    <p className="text-2xl font-bold text-white">
                      {accountStats?.byType.credit_card || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400">Available Credit</p>
                  <p className="text-lg font-bold text-cyan-400">
                    ${accounts
                      .filter((a: BankAccountType) => a.accountType === 'credit_card')
                      .reduce((sum: number, a: BankAccountType) => sum + (Number(a.creditLimit || 0) - Math.abs(Number(a.currentBalance || 0))), 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-900/30 to-slate-800 border-cyan-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-cyan-500/10 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Lines of Credit</p>
                    <p className="text-2xl font-bold text-white">
                      {accountStats?.byType.line_of_credit || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400">Available Credit</p>
                  <p className="text-lg font-bold text-cyan-400">
                    ${accounts
                      .filter((a: BankAccountType) => a.accountType === 'line_of_credit')
                      .reduce((sum: number, a: BankAccountType) => sum + (Number(a.creditLimit || 0) - Math.abs(Number(a.currentBalance || 0))), 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credit Cards Section */}
          {accounts.filter((a: BankAccountType) => a.accountType === 'credit_card').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                Credit Cards
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {accounts
                  .filter((a: BankAccountType) => a.accountType === 'credit_card')
                  .map((account: BankAccountType) => {
                    const balance = Math.abs(Number(account.currentBalance || 0));
                    const limit = Number(account.creditLimit || 0);
                    const available = limit - balance;
                    const utilization = limit > 0 ? (balance / limit) * 100 : 0;
                    const utilizationColor = utilization > 80 ? 'text-red-400' : utilization > 50 ? 'text-yellow-400' : 'text-emerald-400';
                    const barColor = utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-yellow-500' : 'bg-emerald-500';

                    return (
                      <Card key={account.id} className="bg-gradient-to-br from-purple-900/20 to-slate-900 border-purple-700/30 hover:border-purple-600/50 transition-all">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-lg font-bold text-white">{account.accountName}</h4>
                                <p className="text-sm text-slate-400">
                                  {account.institutionName}
                                  {account.accountNumberLast4 && ` •••• ${account.accountNumberLast4}`}
                                </p>
                              </div>
                              <div className="p-2 bg-purple-500/10 rounded-lg">
                                <CreditCard className="w-5 h-5 text-purple-400" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-400">Current Balance</p>
                                <p className="text-xl font-bold text-red-400">
                                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Available Credit</p>
                                <p className="text-xl font-bold text-emerald-400">
                                  ${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-slate-400">Credit Utilization</p>
                                <p className={`text-sm font-bold ${utilizationColor}`}>
                                  {utilization.toFixed(1)}%
                                </p>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div 
                                  className={`${barColor} h-2 rounded-full transition-all`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                ${limit.toLocaleString(undefined, { minimumFractionDigits: 2 })} limit
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Lines of Credit Section */}
          {accounts.filter((a: BankAccountType) => a.accountType === 'line_of_credit').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Lines of Credit
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {accounts
                  .filter((a: BankAccountType) => a.accountType === 'line_of_credit')
                  .map((account: BankAccountType) => {
                    const balance = Math.abs(Number(account.currentBalance || 0));
                    const limit = Number(account.creditLimit || 0);
                    const available = limit - balance;
                    const utilization = limit > 0 ? (balance / limit) * 100 : 0;
                    const utilizationColor = utilization > 80 ? 'text-red-400' : utilization > 50 ? 'text-yellow-400' : 'text-emerald-400';
                    const barColor = utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-yellow-500' : 'bg-emerald-500';

                    return (
                      <Card key={account.id} className="bg-gradient-to-br from-cyan-900/20 to-slate-900 border-cyan-700/30 hover:border-cyan-600/50 transition-all">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-lg font-bold text-white">{account.accountName}</h4>
                                <p className="text-sm text-slate-400">
                                  {account.institutionName}
                                  {account.accountNumberLast4 && ` •••• ${account.accountNumberLast4}`}
                                </p>
                              </div>
                              <div className="p-2 bg-cyan-500/10 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-cyan-400" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-400">Amount Drawn</p>
                                <p className="text-xl font-bold text-red-400">
                                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Available</p>
                                <p className="text-xl font-bold text-emerald-400">
                                  ${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-slate-400">Line Utilization</p>
                                <p className={`text-sm font-bold ${utilizationColor}`}>
                                  {utilization.toFixed(1)}%
                                </p>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div 
                                  className={`${barColor} h-2 rounded-full transition-all`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                ${limit.toLocaleString(undefined, { minimumFractionDigits: 2 })} total line
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Full Account Management */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-cyan-400" />
              All Accounts
            </h3>
            <AccountManagement />
          </div>
        </div>
      )}

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Income</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${metrics.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400">
                      ${metrics.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Net Cash Flow</p>
                    <p className={`text-2xl font-bold ${metrics.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${Math.abs(metrics.netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${metrics.netCashFlow >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
                    <DollarSign className={`w-6 h-6 ${metrics.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Transactions</p>
                    <p className="text-2xl font-bold text-white">{metrics.totalTransactions}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {metrics.pending} pending • {metrics.reconciled} reconciled
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Period</span>
                  <span className="text-white font-semibold">
                    {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Profit Margin</span>
                  <span className={`font-bold ${metrics.income > 0 ? (metrics.netCashFlow / metrics.income * 100 >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}`}>
                    {metrics.income > 0 ? `${(metrics.netCashFlow / metrics.income * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Avg Transaction</span>
                  <span className="text-white font-semibold">
                    ${metrics.totalTransactions > 0 ? ((metrics.income + metrics.expenses) / metrics.totalTransactions).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <div className="space-y-6">
          {/* Pending Transactions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-yellow-400" />
              Pending Transactions ({transactions.filter(t => t.transaction.status === 'pending').length})
            </h3>
            
            {transactions.filter(t => t.transaction.status === 'pending').length > 0 ? (
              transactions.filter(t => t.transaction.status === 'pending').map((item) => {
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
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    className="flex-1 bg-slate-800 border border-cyan-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveDescription(tx.id)}
                                    className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                                  >
                                    <Save size={16} />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-white">{tx.description}</p>
                                  <button
                                    onClick={() => startEditingDescription(tx.id, tx.description)}
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
                                onChange={(e) => setSelectedCategory({ ...selectedCategory, [tx.id]: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                              >
                                <option value="">Select category...</option>
                                {allCategories.map((cat) => (
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
                                onChange={(e) => setSelectedProject({ ...selectedProject, [tx.id]: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                              >
                                <option value="">No project</option>
                                {jobs.map((job: any) => (
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
                            onClick={() => handleDelete(tx.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-400 hover:bg-red-600/10"
                          >
                            <Trash2 size={16} />
                          </Button>
                          <Button
                            onClick={() => handleReconcile(tx.id)}
                            disabled={!selectedCategory[tx.id] || reconcile.isPending}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check size={16} className="mr-2" />
                            Reconcile
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
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
            
            {filteredTransactions.filter(t => t.transaction.status === 'reconciled').length > 0 ? (
              filteredTransactions.filter(t => t.transaction.status === 'reconciled').map((item) => {
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
                                <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full">
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500">No transactions for this period</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Category View */}
      {viewMode === 'category' && (
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = metrics.expenses > 0 ? (amount / metrics.expenses) * 100 : 0;
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 font-medium">{category}</span>
                          <span className="text-white font-bold">
                            ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{percentage.toFixed(1)}% of total expenses</p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Trends View */}
      {viewMode === 'monthly' && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Monthly Trends - {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-center py-8">
              Monthly trend visualization coming soon. This will show income, expenses, and cash flow trends across all months.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Transaction Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete Transaction
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteTransaction.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTransaction.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete All Transactions
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete all transactions for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}? 
              This will permanently delete {filteredTransactions.length} transaction(s). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkDelete}
              disabled={bulkDelete.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDelete.isPending ? 'Deleting...' : `Delete ${filteredTransactions.length} Transaction(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
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
                {/* Group transactions by similar descriptions */}
                {Object.entries(
                  transactions.reduce((acc, item) => {
                    const desc = item.transaction.description;
                    const key = desc.substring(0, 10); // Group by first 10 chars
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(item);
                    return acc;
                  }, {} as Record<string, typeof transactions>)
                )
                  .filter(([_, items]) => items.length > 1) // Only show patterns with multiple transactions
                  .slice(0, 10) // Limit to top 10 patterns
                  .map(([pattern, items]) => {
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
                                  items.forEach(item => updateCategory(item.transaction.id, e.target.value));
                                }
                              }}
                            >
                              <option value="">Category...</option>
                              {allCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <select
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              onChange={(e) => {
                                const projectId = e.target.value ? Number(e.target.value) : undefined;
                                items.forEach(item => updateProject(item.transaction.id, projectId));
                              }}
                            >
                              <option value="">Project...</option>
                              {jobs.map((job: any) => (
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
              onClick={() => setShowQuickAddDialog(false)}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Reconciliation Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-400" />
              Reconcile Imported Transactions
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              You've imported {newlyImportedIds.length} transactions from your bank statement.
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
                  onClick={() => bulkReconcileImported('Legacy')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Mark All {newlyImportedIds.length} as Legacy & Reconcile
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
              onClick={() => {
                setShowReconcileDialog(false);
                setNewlyImportedIds([]);
              }}
              className="border-slate-600 text-slate-300"
            >
              Skip for Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
