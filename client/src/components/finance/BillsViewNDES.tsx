import React, { useState } from 'react';
import { Search, Plus, Receipt, AlertCircle, DollarSign, Calendar, Trash2, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AddBillDialog } from './AddBillDialog';

export function BillsViewNDES() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'overdue'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: bills = [], isLoading } = trpc.bills.getAll.useQuery();
  const { data: stats } = trpc.bills.getStats.useQuery();
  const utils = trpc.useUtils();

  const markAsPaid = trpc.bills.markAsPaid.useMutation({
    onSuccess: () => {
      toast.success('Bill marked as paid');
      utils.bills.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark as paid');
    },
  });

  const deleteBill = trpc.bills.delete.useMutation({
    onSuccess: () => {
      toast.success('Bill deleted');
      utils.bills.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete bill');
    },
  });

  const filteredBills = bills.filter((item) => {
    const bill = item.bill;
    const matchesSearch = bill.vendorName.toLowerCase().includes(search.toLowerCase()) ||
                         bill.billNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkPaid = (billId: number) => {
    const paymentDate = new Date().toISOString();
    markAsPaid.mutate({
      id: billId,
      paymentMethod: 'check',
      paymentDate,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'approved':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'cancelled':
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Pending</p>
              <p className="text-2xl font-bold text-white">${(stats?.totalPending || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Paid</p>
              <p className="text-2xl font-bold text-white">${(stats?.totalPaid || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Overdue</p>
              <p className="text-2xl font-bold text-white">${(stats?.totalOverdue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Bills</p>
              <p className="text-2xl font-bold text-white">{stats?.totalCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {(stats?.overdueCount || 0) > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-rose-400" size={24} />
            <div>
              <p className="font-bold text-rose-400">Overdue Bills Alert</p>
              <p className="text-sm text-rose-400/70">{stats?.overdueCount} bills are past due</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors or bill numbers..."
            className="w-full bg-[#1a1a20] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-white"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-zinc-900 border border-white/5 rounded-2xl p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === f.value ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddDialog(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 rounded-2xl font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
          >
            <Plus size={18} />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase tracking-widest font-bold bg-white/[0.01]">
              <th className="px-8 py-6">Bill #</th>
              <th className="px-8 py-6">Vendor</th>
              <th className="px-8 py-6 text-right">Amount</th>
              <th className="px-8 py-6">Due Date</th>
              <th className="px-8 py-6">Status</th>
              <th className="px-8 py-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredBills.length > 0 ? filteredBills.map((item) => {
              const bill = item.bill;
              const dueDate = new Date(bill.dueDate);
              const isOverdue = dueDate < new Date() && bill.status !== 'paid';

              return (
                <tr key={bill.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                        <Receipt size={18} />
                      </div>
                      <span className="font-bold text-white">{bill.billNumber}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div>
                      <div className="font-bold text-zinc-100">{bill.vendorName}</div>
                      <div className="text-zinc-500 text-xs">{bill.vendorEmail || 'No email'}</div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-mono font-bold text-white">
                    ${Number(bill.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className={isOverdue ? 'text-rose-400' : 'text-zinc-500'} />
                      <span className={`text-sm ${isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                        {dueDate.toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(bill.status ?? 'pending')}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                      {bill.status !== 'paid' && (
                        <button 
                          onClick={() => handleMarkPaid(bill.id)}
                          className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"
                          title="Mark as Paid"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (confirm('Delete this bill?')) {
                            deleteBill.mutate({ id: bill.id });
                          }
                        }}
                        className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-zinc-500 font-medium">
                  No bills found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Bill Dialog */}
      <AddBillDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}
