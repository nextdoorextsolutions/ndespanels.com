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
  Filter
} from 'lucide-react';
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

const CATEGORIES = ['Materials', 'Labor', 'Fuel', 'Permit Fees', 'Marketing', 'Rent', 'Insurance', 'Miscellaneous', 'Income'];

const MONTHS = [
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

type ViewMode = 'summary' | 'detailed' | 'category' | 'monthly';

export function BankingViewEnhanced() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Record<number, string>>({});
  const [selectedProject, setSelectedProject] = useState<Record<number, number | undefined>>({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [statementYear, setStatementYear] = useState(new Date().getFullYear().toString());
  const [statementMonth, setStatementMonth] = useState((new Date().getMonth() + 1).toString());

  const { data: transactions = [], isLoading } = trpc.banking.getAll.useQuery({ status: 'all' });
  const { data: jobs = [] } = trpc.crm.getLeads.useQuery({});
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
      toast.success(`Successfully imported ${data.count} transactions`);
      utils.banking.invalidate();
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to import transactions');
      setIsUploading(false);
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
      const matchesMonth = txMonth === selectedMonth;
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

  const processFile = (file: File, year?: string, month?: string) => {
    const isCSV = file.name.endsWith('.csv');
    const isPDF = file.name.endsWith('.pdf');

    if (!isCSV && !isPDF) {
      toast.error('Please upload a CSV or PDF file');
      return;
    }

    // For PDF files, ask for month/year if not provided
    if (isPDF && (!year || !month)) {
      setPendingFile(file);
      setShowDateDialog(true);
      return;
    }

    setIsUploading(true);

    if (isCSV) {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          // Skip header row and parse CSV
          const transactions = lines.slice(1).map(line => {
            const [date, description, amount, account, reference] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
            
            return {
              transactionDate: date,
              description: description || 'Unknown',
              amount: parseFloat(amount) || 0,
              bankAccount: account,
              referenceNumber: reference,
            };
          }).filter(t => t.amount !== 0);

          if (transactions.length === 0) {
            toast.error('No valid transactions found in CSV');
            setIsUploading(false);
            return;
          }

          bulkImport.mutate({ transactions });
        } catch (error) {
          toast.error('Failed to parse CSV file. Please check the format.');
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
          const text = new TextDecoder().decode(arrayBuffer);
          const lines = text.split('\n').map(line => line.trim()).filter(line => line);
          const transactions: any[] = [];
          
          // Parse Chase bank statement format
          // Look for date pattern: MM/DD (without year, we'll add it from the dialog)
          const datePattern = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})$/;
          
          // Determine if we're in deposits or checks section
          let isDepositsSection = false;
          let isChecksSection = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Track which section we're in
            if (line.includes('DEPOSITS AND ADDITIONS')) {
              isDepositsSection = true;
              isChecksSection = false;
              continue;
            }
            if (line.includes('CHECKS PAID') || line.includes('WITHDRAWALS')) {
              isDepositsSection = false;
              isChecksSection = true;
              continue;
            }
            if (line.includes('Total Deposits') || line.includes('Total Checks') || line.includes('DAILY BALANCE')) {
              isDepositsSection = false;
              isChecksSection = false;
              continue;
            }
            
            // Try to match transaction line
            const match = line.match(datePattern);
            if (match) {
              const [, dateStr, description, amountStr] = match;
              const amount = parseFloat(amountStr.replace(/,/g, ''));
              
              // Build full date with year from dialog
              const [monthDay, day] = dateStr.split('/');
              const fullDate = `${year}-${monthDay.padStart(2, '0')}-${day.padStart(2, '0')}`;
              
              if (amount > 0) {
                transactions.push({
                  transactionDate: fullDate,
                  description: description.trim(),
                  amount: isChecksSection ? -amount : amount,
                  bankAccount: 'Chase Business Checking',
                  referenceNumber: undefined,
                });
              }
            } else {
              // Handle multi-line descriptions (Chase format)
              // If previous line was a date and this line doesn't start with a date, it's a continuation
              if (i > 0 && transactions.length > 0) {
                const prevLine = lines[i - 1];
                if (prevLine.match(/^\d{2}\/\d{2}/)) {
                  // Check if current line is a continuation (no date pattern)
                  if (!line.match(/^\d{2}\/\d{2}/) && !line.match(/^[A-Z\s]+$/)) {
                    // Append to last transaction description
                    const lastTx = transactions[transactions.length - 1];
                    lastTx.description += ' ' + line;
                  }
                }
              }
            }
          }
          
          if (transactions.length === 0) {
            toast.error('No valid transactions found in PDF. Please check the format.');
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
          <h2 className="text-3xl font-bold text-white">Banking & Statements</h2>
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
            accept=".csv,.pdf"
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
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setViewMode('summary')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 ${
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
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 ${
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
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 ${
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
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 ${
            viewMode === 'monthly' 
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar size={16} />
          Monthly Trends
        </button>
      </div>

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
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isExpense ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isExpense ? '−' : '+'}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-white">{tx.description}</p>
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
                                {CATEGORIES.map((cat) => (
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

                        <Button
                          onClick={() => handleReconcile(tx.id)}
                          disabled={!selectedCategory[tx.id] || reconcile.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check size={16} className="mr-2" />
                          Reconcile
                        </Button>
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
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
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
      </div>
    </>
  );
}
