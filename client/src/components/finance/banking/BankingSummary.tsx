/**
 * BankingSummary Component
 * Displays key financial metrics and overview
 */

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MONTHS } from '@/constants/banking-constants';

interface BankingMetrics {
  income: number;
  expenses: number;
  netCashFlow: number;
  categoryBreakdown: Record<string, number>;
  pending: number;
  reconciled: number;
  totalTransactions: number;
}

interface BankingSummaryProps {
  metrics: BankingMetrics;
  selectedMonth: string;
  selectedYear: string;
}

export function BankingSummary({
  metrics,
  selectedMonth,
  selectedYear,
}: BankingSummaryProps) {
  return (
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

      {/* Financial Overview */}
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
  );
}
