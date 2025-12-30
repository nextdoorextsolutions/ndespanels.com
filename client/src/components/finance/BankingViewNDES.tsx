import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Check, Search, Tag, Briefcase, ChevronRight, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const CATEGORIES = ['Materials', 'Labor', 'Fuel', 'Permit Fees', 'Marketing', 'Rent', 'Insurance', 'Miscellaneous', 'Income'];

export function BankingViewNDES() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Record<number, string>>({});
  const [selectedProject, setSelectedProject] = useState<Record<number, number | undefined>>({});

  const { data: transactions = [], isLoading } = trpc.banking.getAll.useQuery({ status: 'all' });
  const { data: jobs = [] } = trpc.crm.getAll.useQuery();
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

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      toast.info('Bank statement upload feature coming soon');
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="flex-1 w-full space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-white">Banking</h2>
              <p className="text-zinc-500 mt-1">Upload and categorize your bank statements</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="bg-zinc-900 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/30 text-white" 
              />
            </div>
          </div>

          <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Upload Bank Statement</h3>
                  <p className="text-xs text-zinc-500">PDF or CSV format</p>
                </div>
              </div>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-6 py-3 bg-purple-600 rounded-2xl font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Upload size={18} />
                {isUploading ? 'Uploading...' : 'Upload Statement'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Pending Transactions ({transactions.filter(t => t.transaction.status === 'pending').length})</h3>
            
            {transactions.filter(t => t.transaction.status === 'pending').length > 0 ? (
              transactions.filter(t => t.transaction.status === 'pending').map((item) => {
                const tx = item.transaction;
                const isExpense = Number(tx.amount) < 0;
                
                return (
                  <div key={tx.id} className="bg-[#1a1a20]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-sm hover:border-purple-500/30 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isExpense ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {isExpense ? '−' : '+'}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-white">{tx.description}</p>
                            <p className="text-xs text-zinc-500">{new Date(tx.transactionDate).toLocaleDateString()}</p>
                          </div>
                          <p className={`text-xl font-bold font-mono ${
                            isExpense ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            ${Math.abs(Number(tx.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block flex items-center gap-1">
                              <Tag size={12} />
                              Category
                            </label>
                            <select
                              value={selectedCategory[tx.id] || ''}
                              onChange={(e) => setSelectedCategory({ ...selectedCategory, [tx.id]: e.target.value })}
                              className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="">Select category...</option>
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block flex items-center gap-1">
                              <Briefcase size={12} />
                              Project (Optional)
                            </label>
                            <select
                              value={selectedProject[tx.id] || ''}
                              onChange={(e) => setSelectedProject({ ...selectedProject, [tx.id]: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="">No project</option>
                              {jobs.map((job) => (
                                <option key={job.id} value={job.id}>
                                  {job.fullName} - {job.address}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleReconcile(tx.id)}
                        disabled={!selectedCategory[tx.id] || reconcile.isPending}
                        className="px-4 py-2 bg-emerald-600 rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check size={16} />
                        Reconcile
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-[#1a1a20]/60 border border-white/5 rounded-2xl p-12 text-center">
                <p className="text-zinc-500">No pending transactions</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Reconciled Transactions</h3>
            
            {transactions.filter(t => t.transaction.status === 'reconciled').slice(0, 10).map((item) => {
              const tx = item.transaction;
              const isExpense = Number(tx.amount) < 0;
              
              return (
                <div key={tx.id} className="bg-[#1a1a20]/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      isExpense ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isExpense ? '−' : '+'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-500">{new Date(tx.transactionDate).toLocaleDateString()}</span>
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
                      isExpense ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      ${Math.abs(Number(tx.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
