import type React from "react";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsMetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ReactNode;
  iconColor: string;
}

export default function AnalyticsMetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  iconColor 
}: AnalyticsMetricCardProps) {
  const isPositive = trend === "up";

  return (
    <Card className="glass-card glow-border p-6 hover:scale-[1.02] transition-transform duration-200 group bg-slate-800/60 border-slate-700/50 will-change-transform">
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm text-slate-400 font-medium">{title}</div>
        <div
          className={cn(
            "p-3 rounded-xl bg-slate-700/40 group-hover:scale-110 transition-transform duration-200",
            iconColor
          )}
        >
          {icon}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-4xl font-bold text-white">{value}</div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md",
              isPositive ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
            )}
          >
            {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {change}
          </div>
          <span className="text-xs text-slate-500">vs last period</span>
        </div>
      </div>
    </Card>
  );
}
