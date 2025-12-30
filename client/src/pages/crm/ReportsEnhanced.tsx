import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Clock,
  Loader2,
  Calendar,
  Zap,
  FileText,
  Users,
  Target,
  Flame,
  AlertCircle,
  Receipt,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import AIInsightsBanner from "@/components/crm/analytics/AIInsightsBanner";

interface ReportsEnhancedProps {
  onTabChange?: (tab: 'analytics' | 'financial') => void;
}

export default function ReportsEnhanced({ onTabChange }: ReportsEnhancedProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch Quick Win Widgets data
  const { data: cashBurn, isLoading: cashBurnLoading } = trpc.reports.getCashBurnRate.useQuery();
  const { data: redList, isLoading: redListLoading } = trpc.reports.getRedList.useQuery();
  const { data: unbilledSummary, isLoading: unbilledLoading } = trpc.reports.getUnbilledRevenueSummary.useQuery();
  
  // Fetch detailed reports
  const { data: profitByCrew, isLoading: profitByCrewLoading } = trpc.reports.getProfitabilityByCrew.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  
  const { data: profitByDealType, isLoading: profitByDealTypeLoading } = trpc.reports.getProfitabilityByDealType.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  
  const { data: wipReport, isLoading: wipLoading } = trpc.reports.getWIPReport.useQuery();
  const { data: arAgingSummary, isLoading: arSummaryLoading } = trpc.reports.getARAgingSummary.useQuery();
  const { data: arAgingDetail, isLoading: arDetailLoading } = trpc.reports.getARAgingDetail.useQuery();
  const { data: apAging, isLoading: apLoading } = trpc.reports.getAPAging.useQuery();
  const { data: commissionClawback, isLoading: clawbackLoading } = trpc.reports.getCommissionClawback.useQuery();
  const { data: leadSourceROI, isLoading: roiLoading } = trpc.reports.getLeadSourceROI.useQuery();

  const isLoading = cashBurnLoading || redListLoading || unbilledLoading;

  return (
    <CRMLayout>
      <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Financial Reports</h1>
            <p className="text-slate-400 mt-1">Advanced financial analytics and insights</p>
          </div>
          <div className="flex gap-3">
            {/* Tab Switcher */}
            {onTabChange && (
              <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
                <button
                  onClick={() => onTabChange('analytics')}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 text-slate-400 hover:text-white"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 bg-[#00d4aa] text-black"
                >
                  <Receipt className="w-4 h-4" />
                  Financial Reports
                </button>
              </div>
            )}
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>

        {/* AI Insights Banner */}
        <AIInsightsBanner />

        {/* Quick Win Widgets - Top Priority Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Cash Burn Rate Widget */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Cash Burn Rate
                </CardTitle>
                {cashBurnLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
            </CardHeader>
            <CardContent>
              {cashBurn ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-400">Current Bank Balance</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${Number(cashBurn.current_bank_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Avg Weekly Expenses</p>
                    <p className="text-xl font-semibold text-slate-200">
                      ${Number(cashBurn.avg_weekly_expenses || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-sm text-slate-400">Weeks of Runway</p>
                    <p className={`text-3xl font-bold ${
                      Number(cashBurn.weeks_of_runway) < 4 ? 'text-red-500' :
                      Number(cashBurn.weeks_of_runway) < 8 ? 'text-yellow-500' :
                      'text-emerald-400'
                    }`}>
                      {Number(cashBurn.weeks_of_runway || 0).toFixed(1)} weeks
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* The Red List Widget */}
          <Card className="bg-gradient-to-br from-red-950 to-slate-900 border-red-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  The Red List
                </CardTitle>
                {redListLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
              <p className="text-xs text-slate-400">Jobs with cost overruns</p>
            </CardHeader>
            <CardContent>
              {redList && redList.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-400">Total Overruns</span>
                    <span className="text-xl font-bold text-red-400">
                      {redList.length} jobs
                    </span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {redList.slice(0, 3).map((job: any) => (
                      <div key={job.job_id} className="bg-slate-800/50 p-2 rounded border border-red-900/30">
                        <p className="text-sm font-medium text-white truncate">{job.customer_name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-slate-400">Overrun</span>
                          <span className="text-sm font-bold text-red-400">
                            ${Number(job.cost_overrun || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {redList.length > 3 && (
                    <p className="text-xs text-slate-500 text-center pt-2">
                      +{redList.length - 3} more jobs
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-emerald-400 font-semibold">✓ All jobs on budget!</p>
                  <p className="text-xs text-slate-500 mt-1">No cost overruns detected</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unbilled Revenue Widget */}
          <Card className="bg-gradient-to-br from-purple-950 to-slate-900 border-purple-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-purple-500" />
                  Unbilled Revenue
                </CardTitle>
                {unbilledLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
              <p className="text-xs text-slate-400">Completed but not invoiced</p>
            </CardHeader>
            <CardContent>
              {unbilledSummary ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-400">Total Unbilled</p>
                    <p className="text-3xl font-bold text-purple-400">
                      ${Number(unbilledSummary.total_unbilled_revenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-sm text-slate-400">Jobs Waiting</p>
                    <p className="text-2xl font-semibold text-slate-200">
                      {unbilledSummary.unbilled_job_count || 0} jobs
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-2"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create Invoices
                  </Button>
                </div>
              ) : (
                <p className="text-slate-500">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Date Range Filter */}
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm text-slate-400 mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-slate-400 mb-2 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <Button 
                variant="outline" 
                className="border-slate-700"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job Profitability Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Profitability by Crew */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-500" />
                Profitability by Crew
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profitByCrewLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : profitByCrew && profitByCrew.length > 0 ? (
                <div className="space-y-3">
                  {profitByCrew.map((crew: any) => (
                    <div key={crew.user_id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-white">{crew.crew_name || 'Unassigned'}</p>
                          <p className="text-sm text-slate-400">{crew.total_jobs} jobs</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          Number(crew.profit_margin_percent) >= 40 ? 'bg-emerald-500/20 text-emerald-400' :
                          Number(crew.profit_margin_percent) >= 25 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {Number(crew.profit_margin_percent || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Revenue</p>
                          <p className="text-white font-semibold">${Number(crew.total_revenue || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Costs</p>
                          <p className="text-white font-semibold">${Number(crew.total_costs || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Profit</p>
                          <p className="text-emerald-400 font-bold">${Number(crew.gross_profit || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Profitability by Deal Type */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Profitability by Deal Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profitByDealTypeLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : profitByDealType && profitByDealType.length > 0 ? (
                <div className="space-y-3">
                  {profitByDealType.map((deal: any) => (
                    <div key={deal.deal_type} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-white capitalize">{deal.deal_type}</p>
                          <p className="text-sm text-slate-400">{deal.total_jobs} jobs</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          Number(deal.profit_margin_percent) >= 40 ? 'bg-emerald-500/20 text-emerald-400' :
                          Number(deal.profit_margin_percent) >= 25 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {Number(deal.profit_margin_percent || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-500">Avg Revenue/Job</p>
                          <p className="text-white font-semibold">${Number(deal.avg_revenue_per_job || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Avg Cost/Job</p>
                          <p className="text-white font-semibold">${Number(deal.avg_cost_per_job || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-slate-500 text-xs">Total Gross Profit</p>
                        <p className="text-emerald-400 font-bold text-lg">${Number(deal.gross_profit || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* WIP Report */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Work In Progress (WIP) - Over/Under Billing
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              Shows if you're cash-rich but owe work (Overbilled) or financing customers (Underbilled)
            </p>
          </CardHeader>
          <CardContent>
            {wipLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : wipReport && wipReport.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left py-3 px-2">Customer</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-right py-3 px-2">Contract</th>
                      <th className="text-right py-3 px-2">% Complete</th>
                      <th className="text-right py-3 px-2">Earned</th>
                      <th className="text-right py-3 px-2">Billed</th>
                      <th className="text-right py-3 px-2">Over/Under</th>
                      <th className="text-left py-3 px-2">Billing Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wipReport.slice(0, 10).map((job: any) => (
                      <tr key={job.job_id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-2">
                          <p className="text-white font-medium">{job.customer_name}</p>
                          <p className="text-xs text-slate-500">{job.address}</p>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                            {job.status}
                          </span>
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          ${Number(job.contract_value || 0).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          {Number(job.percent_complete || 0).toFixed(1)}%
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          ${Number(job.earned_revenue || 0).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          ${Number(job.billings_to_date || 0).toLocaleString()}
                        </td>
                        <td className={`text-right py-3 px-2 font-bold ${
                          Number(job.over_under_billed) > 0 ? 'text-yellow-400' : 
                          Number(job.over_under_billed) < 0 ? 'text-red-400' : 
                          'text-emerald-400'
                        }`}>
                          ${Number(job.over_under_billed || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            job.billing_status === 'Overbilled - Cash Rich, Owe Work' ? 'bg-yellow-500/20 text-yellow-400' :
                            job.billing_status === 'Underbilled - Financing Customer' ? 'bg-red-500/20 text-red-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {job.billing_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No active projects</p>
            )}
          </CardContent>
        </Card>

        {/* AR/AP Aging Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* AR Aging Summary */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Accounts Receivable Aging
              </CardTitle>
              <p className="text-sm text-slate-400">Who owes you money</p>
            </CardHeader>
            <CardContent>
              {arSummaryLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : arAgingSummary && arAgingSummary.length > 0 ? (
                <div className="space-y-2">
                  {arAgingSummary.map((bucket: any) => (
                    <div key={bucket.aging_bucket} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{bucket.aging_bucket}</p>
                        <p className="text-xs text-slate-400">{bucket.invoice_count} invoices</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-400">
                        ${Number(bucket.total_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No outstanding invoices</p>
              )}
            </CardContent>
          </Card>

          {/* AP Aging Summary */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Accounts Payable Aging
              </CardTitle>
              <p className="text-sm text-slate-400">What you owe suppliers</p>
            </CardHeader>
            <CardContent>
              {apLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : apAging && apAging.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {apAging.slice(0, 10).map((bill: any) => (
                    <div key={bill.bill_id} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium">{bill.vendor_name}</p>
                          <p className="text-xs text-slate-400">{bill.bill_number}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          bill.aging_bucket === 'Not Yet Due' ? 'bg-slate-700 text-slate-300' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {bill.aging_bucket}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-400">
                          Due: {new Date(bill.due_date).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-white">
                          ${Number(bill.total_amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No outstanding bills</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lead Source ROI */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Lead Source ROI
            </CardTitle>
            <p className="text-sm text-slate-400">Marketing effectiveness by channel</p>
          </CardHeader>
          <CardContent>
            {roiLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : leadSourceROI && leadSourceROI.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left py-3 px-2">Source</th>
                      <th className="text-right py-3 px-2">Leads</th>
                      <th className="text-right py-3 px-2">Closed</th>
                      <th className="text-right py-3 px-2">Close Rate</th>
                      <th className="text-right py-3 px-2">Revenue</th>
                      <th className="text-right py-3 px-2">CAC</th>
                      <th className="text-right py-3 px-2">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadSourceROI.map((source: any) => (
                      <tr key={source.lead_source} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-2 text-white font-medium capitalize">
                          {source.lead_source || 'Unknown'}
                        </td>
                        <td className="text-right py-3 px-2 text-white">{source.total_leads}</td>
                        <td className="text-right py-3 px-2 text-white">{source.closed_deals}</td>
                        <td className="text-right py-3 px-2 text-white">
                          {Number(source.close_rate_percent || 0).toFixed(1)}%
                        </td>
                        <td className="text-right py-3 px-2 text-emerald-400 font-semibold">
                          ${Number(source.total_revenue || 0).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2 text-white">
                          ${Number(source.customer_acquisition_cost || 0).toLocaleString()}
                        </td>
                        <td className={`text-right py-3 px-2 font-bold ${
                          source.roi_percent !== null && Number(source.roi_percent) > 0 ? 'text-emerald-400' :
                          source.roi_percent !== null ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          {source.roi_percent !== null ? `${Number(source.roi_percent).toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No lead source data</p>
            )}
          </CardContent>
        </Card>

      </div>
    </CRMLayout>
  );
}
