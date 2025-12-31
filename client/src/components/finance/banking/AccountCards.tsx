/**
 * AccountCards Component
 * Displays bank account cards (credit cards, lines of credit, checking accounts)
 */

import React from 'react';
import { CreditCard, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BankAccountType } from '@/constants/banking-constants';

interface AccountCardsProps {
  accounts: BankAccountType[];
}

export function AccountCards({ accounts }: AccountCardsProps) {
  const creditCards = accounts.filter(a => a.accountType === 'credit_card');
  const linesOfCredit = accounts.filter(a => a.accountType === 'line_of_credit');
  const checkingAccounts = accounts.filter(a => a.accountType === 'checking');

  const renderCreditCard = (account: BankAccountType) => {
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
  };

  const renderLineOfCredit = (account: BankAccountType) => {
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
                <p className="text-xs text-slate-400">Utilization</p>
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
  };

  const renderCheckingAccount = (account: BankAccountType) => {
    const balance = Number(account.currentBalance || 0);

    return (
      <Card key={account.id} className="bg-gradient-to-br from-emerald-900/20 to-slate-900 border-emerald-700/30 hover:border-emerald-600/50 transition-all">
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
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400">Current Balance</p>
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Credit Cards */}
      {creditCards.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-400" />
            Credit Cards
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {creditCards.map(renderCreditCard)}
          </div>
        </div>
      )}

      {/* Lines of Credit */}
      {linesOfCredit.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Lines of Credit
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {linesOfCredit.map(renderLineOfCredit)}
          </div>
        </div>
      )}

      {/* Checking Accounts */}
      {checkingAccounts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Checking Accounts
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {checkingAccounts.map(renderCheckingAccount)}
          </div>
        </div>
      )}
    </div>
  );
}
