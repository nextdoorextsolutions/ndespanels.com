import React from 'react';
import { TrendingDown, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function CashFlowForecast() {
  const { data: accountStats } = trpc.bankAccounts.getStats.useQuery();
  const { data: bills = [] } = trpc.bills.getAll.useQuery({
    status: 'pending',
  });

  // Calculate bills due in next 7 days
  const today = new Date();
  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);

  const billsDueNext7Days = bills.filter(item => {
    const dueDate = new Date(item.bill.dueDate);
    return dueDate >= today && dueDate <= next7Days;
  });

  const totalBillsDue = billsDueNext7Days.reduce(
    (sum, item) => sum + parseFloat(item.bill.totalAmount || '0'),
    0
  );

  // Calculate bills due in next 30 days
  const next30Days = new Date(today);
  next30Days.setDate(today.getDate() + 30);

  const billsDueNext30Days = bills.filter(item => {
    const dueDate = new Date(item.bill.dueDate);
    return dueDate >= today && dueDate <= next30Days;
  });

  const totalBillsDue30 = billsDueNext30Days.reduce(
    (sum, item) => sum + parseFloat(item.bill.totalAmount || '0'),
    0
  );

  const currentBalance = accountStats?.totalBalance || 0;
  const safeToSpend7Days = currentBalance - totalBillsDue;
  const safeToSpend30Days = currentBalance - totalBillsDue30;

  const isLowCash7Days = safeToSpend7Days < 1000;
  const isLowCash30Days = safeToSpend30Days < 5000;

  return (
    <div className="bg-[#151a21] border border-gray-800 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Cash Flow Forecast</h2>
          <p className="text-sm text-gray-400">Real available cash after bills</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <DollarSign className="text-cyan-400" size={24} />
        </div>
      </div>

      {/* Current Balance */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Current Bank Balance</span>
          <span className="text-xl font-bold text-white font-mono">
            ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className={`border rounded-xl p-4 mb-4 ${
        isLowCash7Days 
          ? 'bg-rose-500/10 border-rose-500/30' 
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 rounded-lg ${
            isLowCash7Days ? 'bg-rose-500/20' : 'bg-emerald-500/20'
          }`}>
            <Calendar className={isLowCash7Days ? 'text-rose-400' : 'text-emerald-400'} size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">Next 7 Days</span>
              {isLowCash7Days && (
                <AlertTriangle className="text-rose-400" size={16} />
              )}
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Bills Due ({billsDueNext7Days.length})</span>
                <span className="text-rose-400 font-mono">
                  -${totalBillsDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-700">
                <span className={isLowCash7Days ? 'text-rose-400' : 'text-emerald-400'}>
                  Safe to Spend
                </span>
                <span className={`font-mono ${isLowCash7Days ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${safeToSpend7Days.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
        {isLowCash7Days && (
          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 rounded-lg p-2">
            <AlertTriangle size={14} />
            <span>Low cash warning: Consider delaying non-essential expenses</span>
          </div>
        )}
      </div>

      {/* 30-Day Forecast */}
      <div className={`border rounded-xl p-4 ${
        isLowCash30Days 
          ? 'bg-amber-500/10 border-amber-500/30' 
          : 'bg-slate-800/50 border-slate-700'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            isLowCash30Days ? 'bg-amber-500/20' : 'bg-slate-700'
          }`}>
            <TrendingDown className={isLowCash30Days ? 'text-amber-400' : 'text-gray-400'} size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">Next 30 Days</span>
              {isLowCash30Days && (
                <AlertTriangle className="text-amber-400" size={16} />
              )}
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Bills Due ({billsDueNext30Days.length})</span>
                <span className="text-amber-400 font-mono">
                  -${totalBillsDue30.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-700">
                <span className="text-gray-300">Projected Balance</span>
                <span className={`font-mono ${isLowCash30Days ? 'text-amber-400' : 'text-gray-300'}`}>
                  ${safeToSpend30Days.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Bills List */}
      {billsDueNext7Days.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Upcoming Bills (Next 7 Days)
          </p>
          <div className="space-y-2">
            {billsDueNext7Days.slice(0, 3).map((item) => (
              <div key={item.bill.id} className="flex items-center justify-between text-xs">
                <div className="flex-1">
                  <span className="text-white font-medium">{item.bill.vendorName}</span>
                  <span className="text-gray-500 ml-2">
                    Due {new Date(item.bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-rose-400 font-mono">
                  ${parseFloat(item.bill.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            {billsDueNext7Days.length > 3 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{billsDueNext7Days.length - 3} more bills
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
