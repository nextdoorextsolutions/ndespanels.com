import React, { useState } from 'react';
import { Plus, CreditCard, Building2, Wallet, TrendingUp, Edit, Trash2, X } from 'lucide-react';
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

type AccountType = 'checking' | 'savings' | 'credit_card' | 'line_of_credit';

interface AccountFormData {
  accountName: string;
  accountType: AccountType;
  accountNumberLast4: string;
  institutionName: string;
  creditLimit: string;
  currentBalance: string;
  notes: string;
}

const ACCOUNT_TYPE_ICONS = {
  checking: Building2,
  savings: Wallet,
  credit_card: CreditCard,
  line_of_credit: TrendingUp,
};

const ACCOUNT_TYPE_LABELS = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  credit_card: 'Credit Card',
  line_of_credit: 'Line of Credit',
};

export function AccountManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    accountName: '',
    accountType: 'checking',
    accountNumberLast4: '',
    institutionName: '',
    creditLimit: '',
    currentBalance: '',
    notes: '',
  });

  const { data: accounts = [], isLoading } = trpc.bankAccounts.getAll.useQuery({});
  const { data: stats } = trpc.bankAccounts.getStats.useQuery();
  const utils = trpc.useUtils();

  const createAccount = trpc.bankAccounts.create.useMutation({
    onSuccess: () => {
      toast.success('Account created successfully');
      utils.bankAccounts.invalidate();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to create account');
    },
  });

  const updateAccount = trpc.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success('Account updated successfully');
      utils.bankAccounts.invalidate();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to update account');
    },
  });

  const deleteAccount = trpc.bankAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success('Account deleted successfully');
      utils.bankAccounts.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete account');
    },
  });

  const resetForm = () => {
    setFormData({
      accountName: '',
      accountType: 'checking',
      accountNumberLast4: '',
      institutionName: '',
      creditLimit: '',
      currentBalance: '',
      notes: '',
    });
    setEditingAccount(null);
  };

  const handleOpenDialog = (account?: any) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        accountName: account.accountName || '',
        accountType: account.accountType || 'checking',
        accountNumberLast4: account.accountNumberLast4 || '',
        institutionName: account.institutionName || '',
        creditLimit: account.creditLimit?.toString() || '',
        currentBalance: account.currentBalance?.toString() || '',
        notes: account.notes || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.accountName) {
      toast.error('Account name is required');
      return;
    }

    const data = {
      accountName: formData.accountName,
      accountType: formData.accountType,
      accountNumberLast4: formData.accountNumberLast4 || undefined,
      institutionName: formData.institutionName || undefined,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      currentBalance: formData.currentBalance ? parseFloat(formData.currentBalance) : undefined,
      notes: formData.notes || undefined,
    };

    if (editingAccount) {
      updateAccount.mutate({ id: editingAccount.id, ...data });
    } else {
      createAccount.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this account? If it has transactions, it will be deactivated instead.')) {
      deleteAccount.mutate({ id });
    }
  };

  const formatCurrency = (amount: any) => {
    const num = parseFloat(amount?.toString() || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  if (isLoading) {
    return <div className="text-slate-400">Loading accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Total Accounts</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.totalAccounts}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Total Balance</div>
              <div className={`text-2xl font-bold mt-1 ${stats.totalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.totalBalance)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Credit Available</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{formatCurrency(stats.totalCreditLimit)}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-400">Credit Cards</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.byType.credit_card}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accounts List */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Bank Accounts</CardTitle>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus size={16} className="mr-2" />
            Add Account
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No accounts yet. Click "Add Account" to create one.
              </div>
            ) : (
              accounts.map((account: { id: number; accountName: string; accountType: string; accountNumberLast4?: string | null; institutionName?: string | null; creditLimit?: string | null; currentBalance?: string | null; notes?: string | null }) => {
                const Icon = ACCOUNT_TYPE_ICONS[account.accountType as AccountType];
                const isCredit = account.accountType === 'credit_card' || account.accountType === 'line_of_credit';
                
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-slate-800 rounded-lg">
                        <Icon className="text-cyan-400" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold">{account.accountName}</h3>
                          {account.accountNumberLast4 && (
                            <span className="text-slate-500 text-sm">••••{account.accountNumberLast4}</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {ACCOUNT_TYPE_LABELS[account.accountType as AccountType]}
                          {account.institutionName && ` • ${account.institutionName}`}
                        </div>
                        {isCredit && account.creditLimit && (
                          <div className="text-xs text-slate-500 mt-1">
                            Credit Limit: {formatCurrency(account.creditLimit)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${
                          isCredit ? 'text-red-400' : (Number(account.currentBalance) >= 0 ? 'text-green-400' : 'text-red-400')
                        }`}>
                          {formatCurrency(account.currentBalance)}
                        </div>
                        <div className="text-xs text-slate-500">Current Balance</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(account)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Account Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingAccount ? 'Update account details' : 'Create a new bank account, credit card, or line of credit'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="text-sm text-slate-300 mb-2 block">Account Name *</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="e.g., Chase Business Checking"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Account Type *</label>
              <select
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value as AccountType })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="checking">Checking Account</option>
                <option value="savings">Savings Account</option>
                <option value="credit_card">Credit Card</option>
                <option value="line_of_credit">Line of Credit</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Institution Name</label>
              <input
                type="text"
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                placeholder="e.g., Chase Bank"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Last 4 Digits</label>
              <input
                type="text"
                maxLength={4}
                value={formData.accountNumberLast4}
                onChange={(e) => setFormData({ ...formData, accountNumberLast4: e.target.value.replace(/\D/g, '') })}
                placeholder="1234"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Current Balance</label>
              <input
                type="number"
                step="0.01"
                value={formData.currentBalance}
                onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {(formData.accountType === 'credit_card' || formData.accountType === 'line_of_credit') && (
              <div>
                <label className="text-sm text-slate-300 mb-2 block">Credit Limit</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="text-sm text-slate-300 mb-2 block">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this account..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                resetForm();
              }}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createAccount.isPending || updateAccount.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {editingAccount ? 'Update Account' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
