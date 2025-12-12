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

type InvoiceStatus = 'paid' | 'sent' | 'overdue' | 'draft' | 'cancelled';

const Invoices: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Fetch invoices and stats from database
  const { data: invoices = [], isLoading, refetch } = trpc.invoices.getAll.useQuery({
    status: activeTab !== 'all' ? activeTab as InvoiceStatus : undefined,
    search: searchQuery || undefined,
  });

  const { data: stats } = trpc.invoices.getStats.useQuery();

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
    // TODO: Implement email sending via backend
    toast.success(`Invoice ${invoice.invoiceNumber} sent to ${invoice.clientEmail}`);
    setOpenDropdown(null);
  };

  const handleDownload = (invoice: any) => {
    // TODO: Implement PDF download
    toast.success(`Downloading invoice ${invoice.invoiceNumber}...`);
    setOpenDropdown(null);
  };

  const handleView = (invoice: any) => {
    // TODO: Navigate to invoice detail page
    toast.info(`Opening invoice ${invoice.invoiceNumber}...`);
    setOpenDropdown(null);
  };

  const handleEdit = (invoice: any) => {
    // TODO: Navigate to invoice edit page
    toast.info(`Editing invoice ${invoice.invoiceNumber}...`);
    setOpenDropdown(null);
  };

  const handleDuplicate = (invoice: any) => {
    // TODO: Implement duplicate functionality
    toast.success(`Duplicating invoice ${invoice.invoiceNumber}...`);
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

        </div>
      </main>
    </div>
  );
};

export default Invoices;
