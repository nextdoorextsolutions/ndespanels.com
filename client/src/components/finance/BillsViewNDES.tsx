import React, { useState, useMemo, useCallback } from 'react';
import { Search, Plus, Receipt, AlertCircle, DollarSign, Calendar, Trash2, CheckCircle, Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AddBillDialog } from './AddBillDialog';
import { MarkBillPaidDialog } from './MarkBillPaidDialog';
import { BillCSVImport } from './BillCSVImport';

export function BillsViewNDES() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'overdue'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { data: bills = [], isLoading } = trpc.bills.getAll.useQuery();
  const { data: stats } = trpc.bills.getStats.useQuery();
  const utils = trpc.useUtils();

  const deleteBill = trpc.bills.delete.useMutation({
    onSuccess: () => {
      toast.success('Bill deleted');
      utils.bills.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete bill');
    },
  });

  const bulkDeleteBills = trpc.bills.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deleted} bills`);
      setSelectedBills(new Set());
      setShowBulkDeleteDialog(false);
      utils.bills.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete bills');
    },
  });

  // Memoize filtered bills to prevent unnecessary re-renders
  const filteredBills = useMemo(() => {
    return bills.filter((item) => {
      const bill = item.bill;
      const matchesSearch = bill.vendorName.toLowerCase().includes(search.toLowerCase()) ||
                           bill.billNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  const handleMarkPaid = (bill: any) => {
    setSelectedBill(bill);
    setShowMarkPaidDialog(true);
  };

  const toggleBillSelection = (billId: number) => {
    const newSelection = new Set(selectedBills);
    if (newSelection.has(billId)) {
      newSelection.delete(billId);
    } else {
      newSelection.add(billId);
    }
    setSelectedBills(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedBills.size === filteredBills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(filteredBills.map(item => item.bill.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedBills.size === 0) {
      toast.error('No bills selected');
      return;
    }
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteBills.mutate({ ids: Array.from(selectedBills) });
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
          {selectedBills.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete ({selectedBills.size})
            </button>
          )}
          <button 
            onClick={() => setShowImportDialog(true)}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Upload size={18} />
            Import CSV
          </button>
          <button 
            onClick={() => setShowAddDialog(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Add Bill
          </button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase tracking-widest font-bold bg-white/[0.01]">
              <th className="px-8 py-6">
                <input
                  type="checkbox"
                  checked={selectedBills.size === filteredBills.length && filteredBills.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                />
              </th>
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
                    <input
                      type="checkbox"
                      checked={selectedBills.has(bill.id)}
                      onChange={() => toggleBillSelection(bill.id)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
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
                          onClick={() => handleMarkPaid(bill)}
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

      {/* Mark Bill Paid Dialog */}
      <MarkBillPaidDialog
        open={showMarkPaidDialog}
        onOpenChange={setShowMarkPaidDialog}
        bill={selectedBill}
      />

      {/* Import Bills CSV Dialog */}
      <BillCSVImport
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a20] border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="text-rose-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Bills</h3>
                <p className="text-sm text-zinc-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{selectedBills.size}</strong> selected {selectedBills.size === 1 ? 'bill' : 'bills'}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteDialog(false)}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={bulkDeleteBills.isPending}
                className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkDeleteBills.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
