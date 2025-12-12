import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon, 
  DollarSign, 
  FileText, 
  Building,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AuditResult, AuditFlag } from './types';

interface AuditResultsProps {
  data: AuditResult;
  onReset: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'HIGH':
      return <AlertOctagon className="w-5 h-5 text-rose-500" />;
    case 'MEDIUM':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    default:
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
  }
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const styles = {
    HIGH: "bg-rose-100 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-blue-100 text-blue-700 border-blue-200",
  };
  
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${styles[severity as keyof typeof styles] || styles.LOW}`}>
      {severity}
    </span>
  );
};

const AuditResults: React.FC<AuditResultsProps> = ({ data, onReset }) => {
  const chartData = data.line_items_summary.map(item => ({
    name: item.category,
    value: item.total_cost,
  })).sort((a, b) => b.value - a.value);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      <button 
        onClick={onReset}
        className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Upload
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">
              {data.claim_info.carrier}
            </span>
            <span className="text-slate-400 text-sm">|</span>
            <span className="text-slate-500 text-sm">Loss Date: {data.claim_info.loss_date || 'N/A'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Claim #{data.claim_info.claim_number}
          </h1>
        </div>
        
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold">Total RCV</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.claim_info.total_rcv)}</p>
          </div>
          <div className="text-right border-l pl-6 border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-semibold">Net Claim (ACV)</p>
            <p className="text-xl font-semibold text-slate-700">{formatCurrency(data.claim_info.total_acv)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Audit Flags
              </h3>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                {data.audit_flags.length} Issues Found
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {data.audit_flags.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p>No audit flags detected. Good scope!</p>
                </div>
              ) : (
                data.audit_flags.map((flag, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <SeverityIcon severity={flag.severity} />
                        <span className="font-semibold text-slate-800">{flag.issue}</span>
                      </div>
                      <SeverityBadge severity={flag.severity} />
                    </div>
                    <p className="text-slate-600 text-sm pl-7 leading-relaxed">
                      {flag.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                AI Estimator Summary
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-700 italic border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 rounded-r-lg">
                "{data.estimator_notes}"
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Cost Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    width={40}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                Category Breakdown
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.line_items_summary.map((item, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <span className="font-mono text-xs font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 mr-2">
                      {item.category}
                    </span>
                    <span className="text-sm text-slate-600">{item.description}</span>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm">
                    {formatCurrency(item.total_cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>

           <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Deductible</p>
                <p className="font-bold text-lg">{formatCurrency(data.claim_info.deductible)}</p>
              </div>
            </div>
            <div className="border-t border-slate-700 pt-4 mt-4">
              <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Total Line Items</span>
                 <span className="font-bold">{data.line_items_summary.length} Categories</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuditResults;
