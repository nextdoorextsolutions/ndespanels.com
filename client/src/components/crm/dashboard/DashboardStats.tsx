/**
 * DashboardStats Component
 * Top KPI cards with glassmorphism styling and role-based labels
 */

import { Users, DollarSign, Target, BarChart3, Shield, Banknote, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardStatsProps {
  stats: any;
  userRole?: string;
}

export function DashboardStats({ stats, userRole }: DashboardStatsProps) {
  // Role-based label for revenue card
  const revenueLabel = userRole === 'sales_rep' ? 'My Revenue' : 'Company Revenue';
  
  return (
    <>
      {/* KPI Cards - Glassmorphism Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Leads */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 hover:border-emerald-500/50 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] group backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                  {userRole === 'sales_rep' ? 'My Leads' : 'Total Leads'}
                </p>
                <p className="text-4xl font-bold text-emerald-400 mt-2 tracking-tight">{stats?.totalLeads || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Revenue - Role-based label */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 hover:border-green-500/50 transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:shadow-[0_0_25px_rgba(34,197,94,0.25)] group backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                  {revenueLabel}
                </p>
                <p className="text-4xl font-bold text-green-400 mt-2 tracking-tight">${(stats?.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/30 group-hover:bg-green-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Conversion Rate */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 hover:border-purple-500/50 transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] group backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Conversion Rate</p>
                <p className="text-4xl font-bold text-purple-400 mt-2 tracking-tight">
                  {stats?.totalLeads ? ((stats.closedDealCount / stats.totalLeads) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Avg Deal Value */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 hover:border-blue-500/50 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] group backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Avg. Deal Value</p>
                <p className="text-4xl font-bold text-blue-400 mt-2 tracking-tight">
                  ${stats?.closedDealCount ? ((stats.totalRevenue || 0) / stats.closedDealCount).toFixed(0) : 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Types Row - Enhanced Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/crm/leads?filter=insurance">
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-md hover:from-gray-900 hover:to-gray-800 cursor-pointer transition-all group border-l-4 border-l-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] hover:translate-y-[-2px] duration-300">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                <Shield className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Insurance Deals</p>
                <p className="text-2xl font-bold text-white">{stats?.insuranceCount || 0}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/crm/leads?filter=cash">
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-md hover:from-gray-900 hover:to-gray-800 cursor-pointer transition-all group border-l-4 border-l-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] hover:translate-y-[-2px] duration-300">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors border border-green-500/20">
                <Banknote className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Cash Deals</p>
                <p className="text-2xl font-bold text-white">{stats?.cashCount || 0}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/crm/leads?filter=financed">
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-md hover:from-gray-900 hover:to-gray-800 cursor-pointer transition-all group border-l-4 border-l-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:translate-y-[-2px] duration-300">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors border border-purple-500/20">
                <CreditCard className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Financed Deals</p>
                <p className="text-2xl font-bold text-white">{stats?.financedCount || 0}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
