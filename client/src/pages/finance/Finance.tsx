import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  MoreVertical,
  Wallet,
  Loader2,
  LucideIcon,
  LayoutGrid,
  FileText,
  Landmark,
  Package,
  Receipt,
  BarChart3
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useFinanceMetrics } from '@/hooks/useFinanceMetrics';
import { Sidebar } from '@/components/finance/Sidebar';
import { InvoicesViewNDES } from '@/components/finance/InvoicesViewNDES';
import { BankingViewNDES } from '@/components/finance/BankingViewNDES';
import { InventoryViewNDES } from '@/components/finance/InventoryViewNDES';
import { BillsViewNDES } from '@/components/finance/BillsViewNDES';

// TypeScript Interfaces
type InvoiceStatus = 'Paid' | 'Overdue' | 'Sent' | 'Draft';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

interface KPICard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: LucideIcon;
  color: string;
}

// Sub-Components
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<InvoiceStatus, string> = {
    Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    Sent: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    Draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>
      {status}
    </span>
  );
};

// --- Main Dashboard Component ---

export default function OwnerFinanceDashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'banking' | 'inventory' | 'bills'>('dashboard');
  const { data: metrics, isLoading, error } = useFinanceMetrics();

  // Calculate KPIs from real data
  const KPIS = metrics ? [
    { 
      title: 'Total Revenue (YTD)', 
      value: `$${metrics.totalRevenue.toLocaleString()}`, 
      change: `${metrics.paidInvoicesCount} Paid`, 
      isPositive: true, 
      icon: DollarSign,
      color: 'text-cyan-400' 
    },
    { 
      title: 'Outstanding Invoices', 
      value: `$${metrics.outstanding.toLocaleString()}`, 
      change: `${metrics.pendingInvoicesCount} Pending`, 
      isPositive: false,
      icon: AlertCircle,
      color: 'text-rose-500' 
    },
    { 
      title: 'Net Profit', 
      value: `$${metrics.netProfit.toLocaleString()}`, 
      change: metrics.netProfit > 0 ? '+' + ((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1) + '%' : '0%', 
      isPositive: metrics.netProfit > 0, 
      icon: TrendingUp,
      color: 'text-emerald-400' 
    },
    { 
      title: 'Total Expenses', 
      value: `$${metrics.totalExpenses.toLocaleString()}`, 
      change: 'YTD', 
      isPositive: false, 
      icon: Wallet,
      color: 'text-purple-400' 
    },
  ] : [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0B0C10] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#0B0C10] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-gray-400">Error loading financial data</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0C10] text-gray-100 font-sans selection:bg-cyan-500/30">
      
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-gray-800/50 bg-[#0B0C10]/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Financial Overview</h1>
            <p className="text-gray-400 text-sm">Welcome back, here's what's happening today.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Search invoices, clients..." 
                className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 w-64 transition-all"
              />
            </div>
            <button className="p-2.5 text-gray-400 hover:text-white bg-gray-900 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {KPIS.map((kpi, idx) => (
              <div key={idx} className="bg-[#151a21] border border-gray-800 p-6 rounded-2xl hover:border-gray-700 transition-all duration-300 group shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl bg-opacity-10 ${kpi.color.replace('text-', 'bg-')}`}>
                    <kpi.icon className={kpi.color} size={22} />
                  </div>
                  {/* Trend Indicator */}
                  <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                    kpi.isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
                  }`}>
                    {kpi.change}
                    {kpi.isPositive ? <TrendingUp size={12} className="ml-1" /> : <TrendingDown size={12} className="ml-1" />}
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm font-medium">{kpi.title}</h3>
                <p className="text-2xl font-bold text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Main Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#151a21] border border-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Income vs Expenses</h2>
                  <p className="text-sm text-gray-400">Last 6 Months Performance</p>
                </div>
                <div className="flex gap-2">
                    <select className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500">
                        <option>Last 6 Months</option>
                        <option>YTD</option>
                    </select>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.revenueData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                    <XAxis dataKey="name" stroke="#718096" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#718096" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Stats / Cash Flow Mini Widget */}
            <div className="bg-[#151a21] border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
               <div>
                 <h2 className="text-lg font-bold text-white mb-2">Profit Breakdown</h2>
                 <p className="text-sm text-gray-400 mb-6">Net profit by job type</p>
               </div>
               
               <div className="relative h-48 flex items-center justify-center">
                   {/* Abstract representation of a pie chart or gauge */}
                   <div className="w-40 h-40 rounded-full border-[12px] border-gray-800 border-t-cyan-400 border-r-cyan-400 border-b-purple-500 border-l-emerald-500 rotate-45 relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                     <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-45">
                        <span className="text-2xl font-bold text-white">68%</span>
                        <span className="text-xs text-gray-500 uppercase font-semibold">Goal Hit</span>
                     </div>
                   </div>
               </div>

               <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
                          <span className="text-gray-300">Residential</span>
                      </div>
                      <span className="font-bold text-white">$45.2k</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                          <span className="text-gray-300">Commercial</span>
                      </div>
                      <span className="font-bold text-white">$12.8k</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="bg-[#151a21] border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Recent Invoicing</h2>
                <p className="text-sm text-gray-400">Manage billing and collection status</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                  Filter
                </button>
                <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all">
                  + New Invoice
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Invoice ID</th>
                    <th className="px-6 py-4 font-semibold">Client Name</th>
                    <th className="px-6 py-4 font-semibold">Job Address</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(metrics?.recentInvoices || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        No invoices yet. Create your first invoice to get started.
                      </td>
                    </tr>
                  ) : (
                    metrics?.recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-800/50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-medium text-cyan-400">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{inv.clientName}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {inv.address}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white">
                          ${inv.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {inv.invoiceDate}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={inv.status as InvoiceStatus} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}