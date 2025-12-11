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
  Clock
} from 'lucide-react';
import { Sidebar } from '@/components/finance/Sidebar';

type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Draft';

interface Invoice {
  id: string;
  clientName: string;
  jobAddress: string;
  dateSent: string;
  amount: string;
  status: InvoiceStatus;
}

const Invoices: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const invoices: Invoice[] = [
    {
      id: 'INV-2024-001',
      clientName: 'Michael Anderson',
      jobAddress: '124 Maple Ave (Full Replacement)',
      dateSent: 'Oct 24, 2023',
      amount: '$14,250.00',
      status: 'Paid',
    },
    {
      id: 'INV-2024-002',
      clientName: 'Sarah Jenkins',
      jobAddress: '882 Oak Lane (Gutter Repair)',
      dateSent: 'Nov 02, 2023',
      amount: '$1,200.00',
      status: 'Overdue',
    },
    {
      id: 'INV-2024-003',
      clientName: 'Highland Estates HOA',
      jobAddress: 'Building B - Flat Roof Seal',
      dateSent: 'Nov 10, 2023',
      amount: '$8,500.00',
      status: 'Pending',
    },
    {
      id: 'INV-2024-004',
      clientName: 'Robert Vance',
      jobAddress: '402 Pine St (Shingle Repair)',
      dateSent: '-',
      amount: '$450.00',
      status: 'Draft',
    },
  ];

  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab = activeTab === 'All' || inv.status === activeTab;
    const matchesSearch = 
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.jobAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusStyle = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Overdue': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
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
            <div className="bg-[#151a21] p-6 rounded-2xl border border-gray-800 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                </div>
                <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-1 rounded">+2 this week</span>
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Overdue</p>
              <h3 className="text-2xl font-bold text-white">$1,200.00</h3>
            </div>

            <div className="bg-[#151a21] p-6 rounded-2xl border border-gray-800 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-500/10 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-500/10 px-2 py-1 rounded">3 Active</span>
              </div>
              <p className="text-gray-400 text-sm mb-1">Drafts Value</p>
              <h3 className="text-2xl font-bold text-white">$4,650.00</h3>
            </div>

            <div className="bg-[#151a21] p-6 rounded-2xl border border-gray-800 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">+12% YTD</span>
              </div>
              <p className="text-gray-400 text-sm mb-1">Avg. Ticket Size</p>
              <h3 className="text-2xl font-bold text-white">$8,400.00</h3>
            </div>
          </div>

          <div className="bg-[#151a21] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
            
            <div className="p-4 border-b border-gray-800 flex items-center gap-2 overflow-x-auto">
              {['All', 'Draft', 'Pending', 'Overdue', 'Paid'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/50' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
              <div className="ml-auto">
                <button className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {filteredInvoices.length > 0 ? (
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
                          {invoice.id}
                        </td>
                        <td className="p-4 text-sm text-gray-200">
                          {invoice.clientName}
                        </td>
                        <td className="p-4 text-sm text-gray-400 truncate max-w-[200px]" title={invoice.jobAddress}>
                          {invoice.jobAddress}
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {invoice.dateSent}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(invoice.status)}`}>
                            {invoice.status === 'Paid' && <CheckCircle className="w-3 h-3" />}
                            {invoice.status === 'Overdue' && <AlertCircle className="w-3 h-3" />}
                            {invoice.status === 'Pending' && <Clock className="w-3 h-3" />}
                            {invoice.status === 'Draft' && <FileText className="w-3 h-3" />}
                            {invoice.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-right text-gray-100">
                          {invoice.amount}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Download PDF">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Email Client">
                              <Mail className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                              <MoreVertical className="w-4 h-4" />
                            </button>
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
                  {activeTab !== 'All' 
                    ? `There are no ${activeTab.toLowerCase()} invoices at the moment.` 
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
