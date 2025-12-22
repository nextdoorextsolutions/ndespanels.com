import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface PipelineVolumeChartProps {
  data: Array<{ name: string; count: number }>;
}

export default function PipelineVolumeChart({ data }: PipelineVolumeChartProps) {
  return (
    <Card className="glass-card glow-border bg-slate-800/60 border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#00d4aa]" />
            <CardTitle className="text-xl font-semibold text-white">Pipeline Stage Volume</CardTitle>
          </div>
          <div className="text-sm text-slate-400">Last 30 days</div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 170, 0.1)" />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255, 255, 255, 0.5)" 
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(30, 41, 59, 0.9)",
                border: "1px solid rgba(0, 212, 170, 0.3)",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Bar dataKey="count" fill="rgba(0, 212, 170, 0.8)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
