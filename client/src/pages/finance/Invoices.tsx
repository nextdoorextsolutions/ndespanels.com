import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  FileText, 
  Download, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Clock,
  Trash2,
  Edit,
  Eye,
  Copy
} from 'lucide-react';
import { Sidebar } from '@/components/finance/Sidebar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type InvoiceStatus = 'paid' | 'sent' | 'overdue' | 'draft' | 'cancelled';

const Invoices: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<InvoiceStatus>('draft');
  const [editNotes, setEditNotes] = useState<string>('');

  // Fetch invoices and stats from database
  const { data: invoices = [], isLoading, refetch } = trpc.invoices.getAll.useQuery({
    status: activeTab !== 'all' ? activeTab as InvoiceStatus : undefined,
    search: searchQuery || undefined,
  });

  const { data: stats } = trpc.invoices.getStats.useQuery();

  const updateInvoice = trpc.invoices.update.useMutation({
    onSuccess: () => {
      toast.success('Invoice updated');
      setEditOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update invoice');
    },
  });

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success('Invoice duplicated');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to duplicate invoice');
    },
  });

  // Delete mutation
  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success('Invoice deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete invoice');
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice.mutate({ id });
    }
    setOpenDropdown(null);
  };

  const handleEmail = (invoice: any) => {
    if (!invoice.clientEmail) {
      toast.error('No email address on file for this client');
      return;
    }
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber}`);
    const lines = [
      `Hi ${invoice.clientName || ''},`,
      '',
      `Please find your invoice ${invoice.invoiceNumber} attached/linked.`,
      `Total: ${formatCurrency(invoice.totalAmount)}`,
      `Due Date: ${formatDate(invoice.dueDate || null)}`,
      '',
      'Thank you,',
    ];
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${invoice.clientEmail}?subject=${subject}&body=${body}`;
    setOpenDropdown(null);
  };

  const handleDownload = (invoice: any) => {
    try {
      const payload = {
        ...invoice,
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : null,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
        paidDate: invoice.paidDate ? new Date(invoice.paidDate).toISOString() : null,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || 'invoice'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${invoice.invoiceNumber}`);
    } catch {
      toast.error('Failed to download invoice');
    }
    setOpenDropdown(null);
  };

  const handleView = (invoice: any) => {
    setSelectedInvoice(invoice);
    setViewOpen(true);
    setOpenDropdown(null);
  };

  const handleEdit = (invoice: any) => {
    setSelectedInvoice(invoice);
    setEditStatus(invoice.status as InvoiceStatus);
    setEditNotes(invoice.notes || '');
    setEditOpen(true);
    setOpenDropdown(null);
  };

  const handleDuplicate = (invoice: any) => {
    const ts = new Date();
    const suffix = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}`;
    const newInvoiceNumber = `${invoice.invoiceNumber}-COPY-${suffix}`;
    createInvoice.mutate({
      invoiceNumber: newInvoiceNumber,
      reportRequestId: invoice.reportRequestId || undefined,
      clientName: invoice.clientName || 'Unknown',
      clientEmail: invoice.clientEmail || undefined,
      amount: Number(invoice.amount) / 100, // Convert cents to dollars
      taxAmount: Number(invoice.taxAmount || 0) / 100, // Convert cents to dollars
      totalAmount: Number(invoice.totalAmount) / 100, // Convert cents to dollars
      invoiceDate: new Date().toISOString(),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : new Date().toISOString(),
      notes: invoice.notes || undefined,
    });
    setOpenDropdown(null);
  };

  const filteredInvoices = invoices;

  const getStatusStyle = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'overdue': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'sent': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'draft': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex min-h-screen bg-[#0B0C10] text-gray-100 font-sans selection:bg-cyan-500/30">
      
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Invoices</h1>
              <p className="text-gray-400 text-sm">Manage billing, track payments, and export records.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search invoices..." 
                  className="bg-gray-900 border border-gray-700 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-cyan-500 w-64 transition-colors placeholder-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#151a21] rounded-2xl border border-gray-800 p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-gray-400 text-sm">Total Overdue</p>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(stats?.totalOverdue || 0)}</h3>
            </div>

            <div className="bg-[#151a21] rounded-2xl border border-gray-800 p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-gray-400 text-sm">Draft Invoices</p>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-white">{stats?.totalDrafts || 0}</h3>
                <span className="text-cyan-400 text-sm font-medium">{stats?.activeCount || 0} Active</span>
              </div>
            </div>

            <div className="bg-[#151a21] p-6 rounded-2xl border border-gray-800 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">+12% YTD</span>
              </div>
              <p className="text-gray-400 text-sm mb-1">Avg. Ticket Size</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(stats?.avgTicketSize || 0)}</h3>
            </div>
          </div>

          <div className="bg-[#151a21] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
            
            <div className="p-4 border-b border-gray-800 flex items-center gap-2 overflow-x-auto">
              {['all', 'draft', 'sent', 'overdue', 'paid'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/50' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
              <div className="ml-auto">
                <button className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">Invoice ID</th>
                      <th className="p-4 font-medium">Client</th>
                      <th className="p-4 font-medium w-1/3">Job Address</th>
                      <th className="p-4 font-medium">Date Sent</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium text-right">Amount</th>
                      <th className="p-4 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-800/50 transition-colors group">
                        <td className="p-4 text-sm font-medium text-cyan-400 cursor-pointer hover:underline">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="p-4 text-sm text-gray-200">
                          {invoice.clientName}
                        </td>
                        <td className="p-4 text-sm text-gray-400 truncate max-w-[200px]" title={invoice.jobAddress || 'N/A'}>
                          {invoice.jobAddress || 'N/A'}
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {formatDate(invoice.invoiceDate)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(invoice.status)}`}>
                            {invoice.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                            {invoice.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                            {invoice.status === 'sent' && <Clock className="w-3 h-3" />}
                            {invoice.status === 'draft' && <FileText className="w-3 h-3" />}
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-right text-gray-100">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDownload(invoice)}
                              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" 
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEmail(invoice)}
                              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" 
                              title="Email Client"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <div className="relative">
                              <button 
                                onClick={() => setOpenDropdown(openDropdown === invoice.id ? null : invoice.id)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                                title="More Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {openDropdown === invoice.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setOpenDropdown(null)}
                                  />
                                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                    <button
                                      onClick={() => handleView(invoice)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => handleEdit(invoice)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                                    >
                                      <Edit className="w-4 h-4" />
                                      Edit Invoice
                                    </button>
                                    <button
                                      onClick={() => handleDuplicate(invoice)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Duplicate
                                    </button>
                                    <div className="border-t border-gray-700" />
                                    <button
                                      onClick={() => handleDelete(invoice.id)}
                                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                      disabled={deleteInvoice.isPending}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete Invoice
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="bg-gray-800/50 p-4 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No invoices found</h3>
                <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
                  {activeTab !== 'all' 
                    ? `There are no ${activeTab} invoices at the moment.` 
                    : "Get started by creating your first invoice for a roofing job."}
                </p>
                <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2 px-4 rounded-lg text-sm transition-all">
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Invoice Details</DialogTitle>
              </DialogHeader>
              {selectedInvoice && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Invoice</span><span className="text-white font-medium">{selectedInvoice.invoiceNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Client</span><span className="text-white">{selectedInvoice.clientName || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="text-white">{selectedInvoice.clientEmail || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Job Address</span><span className="text-white">{selectedInvoice.jobAddress || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="text-white">{String(selectedInvoice.status || '').toUpperCase()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Invoice Date</span><span className="text-white">{formatDate(selectedInvoice.invoiceDate || null)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Due Date</span><span className="text-white">{formatDate(selectedInvoice.dueDate || null)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="text-white font-semibold">{formatCurrency(selectedInvoice.totalAmount)}</span></div>
                  <div>
                    <div className="text-slate-400 mb-1">Notes</div>
                    <div className="text-white whitespace-pre-wrap">{selectedInvoice.notes || '—'}</div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
                    <Button onClick={() => handleEmail(selectedInvoice)}>Email</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit Invoice</DialogTitle>
              </DialogHeader>
              {selectedInvoice && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Status</div>
                    <div className="flex flex-wrap gap-2">
                      {(['draft','sent','paid','overdue','cancelled'] as InvoiceStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditStatus(s)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${editStatus === s ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Notes</div>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => updateInvoice.mutate({ id: selectedInvoice.id, status: editStatus, notes: editNotes })}
                      disabled={updateInvoice.isPending}
                    >
                      {updateInvoice.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </div>
  );
};

export default Invoices;
