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
      {/* KPI Cards - Neon Futuristic Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Leads - Blue Neon */}
        <div className="p-[2px] rounded-2xl bg-gradient-to-br from-blue-500 via-blue-400 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 group">
          <Card className="bg-[#0a0e1a] border-0 rounded-[14px] h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                    {userRole === 'sales_rep' ? 'My Leads' : 'Total Leads'}
                  </p>
                  <p className="text-4xl font-bold text-white mt-2 tracking-tight">{stats?.totalLeads || 0}</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/40 group-hover:bg-blue-500/30 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 2: Revenue - Green Neon */}
        <div className="p-[2px] rounded-2xl bg-gradient-to-br from-emerald-500 via-green-400 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300 group">
          <Card className="bg-[#0a0e1a] border-0 rounded-[14px] h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                    {revenueLabel}
                  </p>
                  <p className="text-4xl font-bold text-white mt-2 tracking-tight">${(stats?.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 group-hover:bg-emerald-500/30 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <DollarSign className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 3: Conversion Rate - Purple Neon */}
        <div className="p-[2px] rounded-2xl bg-gradient-to-br from-purple-500 via-purple-400 to-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300 group">
          <Card className="bg-[#0a0e1a] border-0 rounded-[14px] h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Conversion Rate</p>
                  <p className="text-4xl font-bold text-white mt-2 tracking-tight">
                    {stats?.totalLeads ? ((stats.closedDealCount / stats.totalLeads) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 group-hover:bg-purple-500/30 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <Target className="w-7 h-7 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 4: Avg Deal Value - Blue Neon */}
        <div className="p-[2px] rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 group">
          <Card className="bg-[#0a0e1a] border-0 rounded-[14px] h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Avg. Deal Value</p>
                  <p className="text-4xl font-bold text-white mt-2 tracking-tight">
                    ${stats?.closedDealCount ? ((stats.totalRevenue || 0) / stats.closedDealCount).toFixed(0) : 0}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/40 group-hover:bg-blue-500/30 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <BarChart3 className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deal Types Row - Neon Borders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/crm/leads?filter=insurance">
          <div className="p-[2px] rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-300 group cursor-pointer">
          <Card className="bg-[#0a0e1a] border-0 rounded-[10px] h-full hover:bg-[#0f1420] transition-colors">
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
          </div>
        </Link>
        
        <Link href="/crm/leads?filter=cash">
          <div className="p-[2px] rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-300 group cursor-pointer">
          <Card className="bg-[#0a0e1a] border-0 rounded-[10px] h-full hover:bg-[#0f1420] transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-full group-hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                <Banknote className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Cash Deals</p>
                <p className="text-2xl font-bold text-white">{stats?.cashCount || 0}</p>
              </div>
            </CardContent>
          </Card>
          </div>
        </Link>
        
        <Link href="/crm/leads?filter=financed">
          <div className="p-[2px] rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all duration-300 group cursor-pointer">
          <Card className="bg-[#0a0e1a] border-0 rounded-[10px] h-full hover:bg-[#0f1420] transition-colors">
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
          </div>
        </Link>
      </div>
    </>
  );
}
