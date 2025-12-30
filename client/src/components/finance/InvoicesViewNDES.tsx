import React, { useState, useMemo } from 'react';
import { Search, Plus, MoreVertical, FileText, Download, Mail, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function InvoicesViewNDES() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'sent' | 'overdue' | 'draft'>('all');

  // Fetch invoices from database
  const { data: invoices = [], isLoading } = trpc.invoices.getAll.useQuery();
  const utils = trpc.useUtils();

  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success('Invoice deleted');
      utils.invoices.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete invoice');
    },
  });

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch = 
        inv.clientName?.toLowerCase().includes(search.toLowerCase()) || 
        inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || inv.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, invoices]);

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice.mutate({ id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'sent':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'draft':
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices or clients..."
            className="w-full bg-[#1a1a20] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-white"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-zinc-900 border border-white/5 rounded-2xl p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'paid', label: 'Paid' },
              { value: 'sent', label: 'Sent' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'draft', label: 'Draft' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filter === f.value ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase tracking-widest font-bold bg-white/[0.01]">
              <th className="px-8 py-6">Invoice</th>
              <th className="px-8 py-6">Client</th>
              <th className="px-8 py-6 text-right">Amount</th>
              <th className="px-8 py-6">Status</th>
              <th className="px-8 py-6 text-right">Date</th>
              <th className="px-8 py-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <FileText size={18} />
                    </div>
                    <span className="font-bold text-white">{inv.invoiceNumber}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div>
                    <div className="font-bold text-zinc-100">{inv.clientName}</div>
                    <div className="text-zinc-500 text-xs">{inv.clientEmail}</div>
                  </div>
                </td>
                <td className="px-8 py-6 text-right font-mono font-bold text-white">
                  ${Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right text-zinc-500 text-sm font-medium">
                  {new Date(inv.invoiceDate).toLocaleDateString()}
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      className="p-2 text-zinc-500 hover:text-green-400 transition-colors"
                      title="Email"
                    >
                      <Mail size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(inv.id)}
                      className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-zinc-500 font-medium">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
