import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar as CalendarIcon, TrendingUp, Trophy, Medal, Award, DollarSign, Target, Clock } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import CRMLayout from "@/components/crm/CRMLayout";

export default function PerformanceDashboard() {
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [interval, setInterval] = useState<"daily" | "weekly">("daily");
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Fetch sales metrics
  const { data: salesData, isLoading: salesLoading } = trpc.analytics.getSalesMetrics.useQuery({
    startDate: format(dateRange.start, "yyyy-MM-dd"),
    endDate: format(dateRange.end, "yyyy-MM-dd"),
  });

  // Fetch production velocity
  const { data: velocityData, isLoading: velocityLoading } = trpc.analytics.getProductionVelocity.useQuery({
    startDate: format(dateRange.start, "yyyy-MM-dd"),
    endDate: format(dateRange.end, "yyyy-MM-dd"),
    interval: interval,
  });

  const setThisMonth = () => {
    setDateRange({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    });
  };

  const setLast30Days = () => {
    setDateRange({
      start: subDays(new Date(), 30),
      end: new Date(),
    });
  };

  const setLast7Days = () => {
    setDateRange({
      start: subDays(new Date(), 7),
      end: new Date(),
    });
  };

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Performance Dashboard</h1>
          <p className="text-slate-400">Team metrics and production velocity</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Quick Date Presets */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={setLast7Days}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              onClick={setLast30Days}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              onClick={setThisMonth}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              This Month
            </Button>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2">
            <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(dateRange.start, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700">
                <Calendar
                  mode="single"
                  selected={dateRange.start}
                  onSelect={(date) => {
                    if (date) {
                      setDateRange({ ...dateRange, start: date });
                      setShowStartCalendar(false);
                    }
                  }}
                  className="text-white"
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-400">to</span>

            <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(dateRange.end, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700">
                <Calendar
                  mode="single"
                  selected={dateRange.end}
                  onSelect={(date) => {
                    if (date) {
                      setDateRange({ ...dateRange, end: date });
                      setShowEndCalendar(false);
                    }
                  }}
                  className="text-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Interval Toggle */}
          <div className="flex gap-2 ml-auto">
            <Button
              variant={interval === "daily" ? "default" : "outline"}
              onClick={() => setInterval("daily")}
              className={interval === "daily" ? "bg-[#00d4aa] hover:bg-[#00b894] text-black" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
            >
              Daily
            </Button>
            <Button
              variant={interval === "weekly" ? "default" : "outline"}
              onClick={() => setInterval("weekly")}
              className={interval === "weekly" ? "bg-[#00d4aa] hover:bg-[#00b894] text-black" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
            >
              Weekly
            </Button>
          </div>
        </div>

        {/* Production Velocity Chart */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00d4aa]" />
              Production Velocity
            </CardTitle>
            <p className="text-sm text-slate-400">Jobs scheduled vs completed over time</p>
          </CardHeader>
          <CardContent>
            {velocityLoading ? (
              <div className="flex items-center justify-center h-80">
                <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
              </div>
            ) : velocityData?.data && velocityData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={velocityData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: number) => [value, '']}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8' }}
                  />
                  <Bar 
                    dataKey="jobsScheduled" 
                    fill="#00d4aa" 
                    name="Jobs Scheduled"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="jobsCompleted" 
                    fill="#00b894" 
                    name="Jobs Completed"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="revenueCollected" 
                    fill="#fbbf24" 
                    name="Revenue ($)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-slate-400">
                No data available for selected date range
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Leaderboard */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Sales Leaderboard
          </h2>

          {/* Winner Cards */}
          {salesLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
            </div>
          ) : salesData?.leaderboard && salesData.leaderboard.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {salesData.leaderboard.map((user, index) => {
                  const icons = [
                    { Icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/20", border: "border-yellow-500/30" },
                    { Icon: Medal, color: "text-slate-400", bg: "bg-slate-400/20", border: "border-slate-400/30" },
                    { Icon: Award, color: "text-amber-700", bg: "bg-amber-700/20", border: "border-amber-700/30" },
                  ];
                  const { Icon, color, bg, border } = icons[index] || icons[2];

                  return (
                    <Card key={user.userId} className={`bg-slate-800 border-2 ${border}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-400">#{index + 1} Top Performer</p>
                            <p className="text-lg font-bold text-white">{user.userName}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-400">Revenue</span>
                            <span className="text-lg font-bold text-[#00d4aa]">
                              ${user.revenue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-400">Conversion</span>
                            <span className="text-sm font-semibold text-white">
                              {user.conversionRate}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-400">Closed Deals</span>
                            <span className="text-sm font-semibold text-white">
                              {user.closedDeals}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Full Team Table */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Full Team Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-700/50 border-b border-slate-600">
                          <th className="text-left p-4 text-sm font-semibold text-slate-300">Rep Name</th>
                          <th className="text-left p-4 text-sm font-semibold text-slate-300">Role</th>
                          <th className="text-right p-4 text-sm font-semibold text-slate-300">Leads Assigned</th>
                          <th className="text-right p-4 text-sm font-semibold text-slate-300">Closed Deals</th>
                          <th className="text-right p-4 text-sm font-semibold text-slate-300">Total Revenue</th>
                          <th className="text-right p-4 text-sm font-semibold text-slate-300">Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.metrics
                          .sort((a, b) => b.revenue - a.revenue)
                          .map((user) => (
                            <tr key={user.userId} className="border-b border-slate-700 hover:bg-slate-700/30">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {user.userImage ? (
                                    <img 
                                      src={user.userImage} 
                                      alt={user.userName}
                                      className="w-8 h-8 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center">
                                      <span className="text-black font-semibold text-sm">
                                        {user.userName.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-white font-medium">{user.userName}</p>
                                    <p className="text-xs text-slate-400">{user.userEmail}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-sm text-slate-300 capitalize">
                                  {user.userRole.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-4 text-right text-white">{user.leadsAssigned}</td>
                              <td className="p-4 text-right text-white">{user.closedDeals}</td>
                              <td className="p-4 text-right">
                                <span className="text-[#00d4aa] font-semibold">
                                  ${user.revenue.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className={`font-semibold ${
                                  user.conversionRate >= 50 ? 'text-green-400' :
                                  user.conversionRate >= 25 ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {user.conversionRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400">
              No sales data available for selected date range
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
