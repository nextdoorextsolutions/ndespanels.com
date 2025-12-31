/**
 * Banking Metrics Hook
 * Handles filtering and calculating financial metrics for transactions
 */

import { useMemo } from 'react';

interface Transaction {
  transaction: {
    id: number;
    transactionDate: Date | string;
    description: string;
    amount: string;
    category?: string | null;
    status: string;
  };
  project?: {
    id: number;
    fullName: string;
  } | null;
}

interface MetricsFilters {
  year: string;
  month: string;
  search: string;
  category: string;
}

interface BankingMetrics {
  income: number;
  expenses: number;
  netCashFlow: number;
  categoryBreakdown: Record<string, number>;
  pending: number;
  reconciled: number;
  totalTransactions: number;
}

export function useBankingMetrics(
  transactions: Transaction[],
  filters: MetricsFilters
) {
  // Filter transactions by year, month, search, and category
  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const tx = item.transaction;
      const txDate = new Date(tx.transactionDate);
      const txYear = txDate.getFullYear().toString();
      const txMonth = (txDate.getMonth() + 1).toString();
      
      const matchesYear = txYear === filters.year;
      
      // Handle different month filter modes
      let matchesMonth = true;
      if (filters.month === 'all') {
        matchesMonth = true;
      } else if (filters.month === 'ytd') {
        const today = new Date();
        const currentYear = today.getFullYear().toString();
        if (txYear === currentYear) {
          matchesMonth = txDate <= today;
        } else {
          matchesMonth = false;
        }
      } else {
        matchesMonth = txMonth === filters.month;
      }
      
      const matchesSearch = filters.search === '' || 
        tx.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        tx.category?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesCategory = filters.category === 'all' || tx.category === filters.category;
      
      return matchesYear && matchesMonth && matchesSearch && matchesCategory;
    });
  }, [transactions, filters.year, filters.month, filters.search, filters.category]);

  // Calculate financial metrics
  const metrics = useMemo<BankingMetrics>(() => {
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

  return {
    filteredTransactions,
    metrics,
  };
}
