import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface RevenueTypeChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export default function RevenueTypeChart({ data }: RevenueTypeChartProps) {
  return (
    <Card className="glass-card glow-border bg-slate-800/60 border-slate-700/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-[#00d4aa]" />
          <CardTitle className="text-xl font-semibold text-white">Revenue by Type</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie 
              data={data} 
              cx="50%" 
              cy="50%" 
              labelLine={false} 
              outerRadius={80} 
              fill="#8884d8" 
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(30, 41, 59, 0.9)",
                border: "1px solid rgba(0, 212, 170, 0.3)",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value: number) => `$${value.toFixed(0)}`}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-400">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-white">${item.value.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
