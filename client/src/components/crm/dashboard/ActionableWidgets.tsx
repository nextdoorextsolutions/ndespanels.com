/**
 * ActionableWidgets Component
 * Lien Rights tracker, Action Items, Quick Actions with glassmorphism
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  Users,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  Phone,
  Plus,
  AlertTriangle,
  Gavel,
  Bell,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

interface ActionableWidgetsProps {
  stats: any;
  lienRightsJobs: any[];
  todayDate: string;
  appointments: any[];
}

const actionItems = [
  { key: "unassigned", label: "Unassigned Leads", icon: Users, color: "text-orange-400" },
  { key: "follow_up", label: "Needs Follow-up", icon: Phone, color: "text-yellow-400" },
  { key: "pending_inspection", label: "Pending Inspection", icon: Calendar, color: "text-blue-400" },
  { key: "lien_warning", label: "Lien Rights Warning", icon: AlertTriangle, color: "text-yellow-500" },
  { key: "lien_critical", label: "Lien Rights Critical", icon: AlertCircle, color: "text-red-500" },
  { key: "overdue", label: "Overdue Tasks", icon: Clock, color: "text-red-400" },
];

function SendLienRightsAlertButton() {
  const sendAlert = trpc.crm.sendLienRightsAlert.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        if (result.warningCount === 0 && result.criticalCount === 0) {
          toast.info("No jobs requiring lien rights alerts at this time.");
        } else {
          toast.success(`Lien rights alert sent for ${result.criticalCount} critical and ${result.warningCount} warning jobs.`);
        }
      } else {
        toast.error((result as any).error || "Failed to send lien rights alert.");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send alert.");
    },
  });

  return (
    <Button
      variant="outline"
      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 transition-all bg-transparent"
      onClick={() => sendAlert.mutate({})}
      disabled={sendAlert.isPending}
    >
      {sendAlert.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Bell className="w-4 h-4 mr-2" />
      )}
      Send Lien Rights Alert
    </Button>
  );
}

export function ActionableWidgets({ stats, lienRightsJobs, todayDate, appointments }: ActionableWidgetsProps) {
  const getActionCount = (key: string) => {
    if (!stats) return 0;
    switch (key) {
      case "unassigned": return stats.leadCount || 0;
      case "follow_up": return stats.followUpCount || 0;
      case "pending_inspection": return stats.appointmentSetCount || 0;
      case "lien_warning": return stats.lienWarningCount || 0;
      case "lien_critical": return stats.lienCriticalCount || 0;
      default: return 0;
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-4 border-b border-gray-800/50">
          <CardTitle className="text-lg font-bold text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Link href="/crm/leads?new=true">
              <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold border-none shadow-[0_4px_14px_0_rgba(0,212,170,0.39)]">
                <Plus className="w-4 h-4 mr-2" />
                Add New Job
              </Button>
            </Link>
            <Link href="/crm/reports">
              <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/50 bg-transparent transition-all">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </Link>
            <Link href="/crm/calendar">
              <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500/50 bg-transparent transition-all">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Inspection
              </Button>
            </Link>
            <SendLienRightsAlertButton />
          </div>
        </CardContent>
      </Card>

      {/* Action Items Grid */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-4 border-b border-gray-800/50">
          <CardTitle className="text-lg font-bold text-white">Action Items</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {actionItems.map((item) => {
              const count = getActionCount(item.key);
              const isAlert = item.key.includes('lien') && count > 0;
              return (
                <Link key={item.key} href={`/crm/leads?filter=${item.key}`}>
                  <div className={`
                    flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer group
                    ${isAlert 
                      ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                      : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 shadow-[0_0_10px_rgba(0,0,0,0.1)]'}
                  `}>
                    <div className={`p-2 rounded-lg ${isAlert ? 'bg-red-500/20' : 'bg-gray-700/50 group-hover:bg-gray-700'}`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium truncate uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-xl font-bold text-white">{count}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lien Rights Summary */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-4 border-b border-gray-800/50">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Gavel className="w-5 h-5 text-red-400" />
            Lien Rights (90 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <Link href="/crm/leads?category=lien_rights&status=active">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors cursor-pointer group">
                <span className="text-green-400 text-sm font-medium group-hover:text-green-300">Active</span>
                <span className="font-bold text-white bg-green-500/20 px-2.5 py-1 rounded text-sm group-hover:bg-green-500/30">
                  {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "active").length || 0}
                </span>
              </div>
            </Link>
            <Link href="/crm/leads?category=lien_rights&status=warning">
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors cursor-pointer group">
                <span className="text-yellow-400 text-sm font-medium group-hover:text-yellow-300">Warning</span>
                <span className="font-bold text-white bg-yellow-500/20 px-2.5 py-1 rounded text-sm group-hover:bg-yellow-500/30">
                  {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "warning").length || 0}
                </span>
              </div>
            </Link>
            <Link href="/crm/leads?category=lien_rights&status=critical">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors cursor-pointer group">
                <span className="text-red-400 text-sm font-medium group-hover:text-red-300">Critical</span>
                <span className="font-bold text-white bg-red-500/20 px-2.5 py-1 rounded text-sm animate-pulse group-hover:bg-red-500/30">
                  {lienRightsJobs?.filter((j: any) => j.urgencyLevel === "critical").length || 0}
                </span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00d4aa]" />
              Today
            </CardTitle>
            <Link href="/crm/calendar">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700/50 h-8">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {appointments && appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.slice(0, 5).map((apt: any) => (
                <Link key={apt.id} href={`/crm/job/${apt.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border-l-[3px] border-l-[#00d4aa] bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors group shadow-sm">
                    <div className="flex-1">
                      <p className="font-medium text-white group-hover:text-[#00d4aa] transition-colors">{apt.fullName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 group-hover:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(apt.scheduledDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No appointments today</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
