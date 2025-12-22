import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SalesRep {
  name: string;
  revenue: number;
  deals: number;
  avatar: string;
}

interface TopSalesRepsChartProps {
  reps: SalesRep[];
}

export default function TopSalesRepsChart({ reps }: TopSalesRepsChartProps) {
  const maxRevenue = Math.max(...reps.map((r) => r.revenue), 1);

  return (
    <Card className="glass-card glow-border bg-slate-800/60 border-slate-700/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#00d4aa]" />
          <CardTitle className="text-xl font-semibold text-white">Top Sales Reps</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reps.map((rep, index) => {
            const percentage = (rep.revenue / maxRevenue) * 100;

            return (
              <div key={rep.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-[#00d4aa]/50">
                        <AvatarFallback className="bg-[#00d4aa]/20 text-[#00d4aa] font-semibold">
                          {rep.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs">
                          👑
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white">{rep.name}</div>
                      <div className="text-xs text-slate-400">{rep.deals} deals closed</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">${(rep.revenue / 1000).toFixed(0)}k</div>
                  </div>
                </div>
                <div className="relative h-2 bg-slate-700/30 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00d4aa] to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
