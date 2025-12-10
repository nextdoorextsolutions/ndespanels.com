import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LeadTrendsChartProps {
  data: { month: string; leads: number; closed: number }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-900 mb-2">
          {payload[0].payload.month}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#00d4aa]" />
            <span className="text-xs text-slate-600">Leads:</span>
            <span className="text-xs font-semibold text-slate-900">
              {payload[0].value}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#334155]" />
            <span className="text-xs text-slate-600">Closed:</span>
            <span className="text-xs font-semibold text-slate-900">
              {payload[1].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const LeadTrendsChart = memo(({ data }: LeadTrendsChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-400">
        <p>No trend data available yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#334155"
          opacity={0.3}
        />
        <XAxis
          dataKey="month"
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={{ stroke: "#475569" }}
        />
        <YAxis
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={{ stroke: "#475569" }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e293b" }} />
        <Legend
          wrapperStyle={{
            paddingTop: "20px",
          }}
          iconType="rect"
          formatter={(value) => (
            <span className="text-sm text-slate-300">{value}</span>
          )}
        />
        <Bar
          dataKey="leads"
          name="Leads"
          fill="#00d4aa"
          radius={[4, 4, 0, 0]}
          maxBarSize={60}
        />
        <Bar
          dataKey="closed"
          name="Closed"
          fill="#334155"
          radius={[4, 4, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

LeadTrendsChart.displayName = "LeadTrendsChart";
