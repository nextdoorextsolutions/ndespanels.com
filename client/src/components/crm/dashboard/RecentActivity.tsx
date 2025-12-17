/**
 * RecentActivity Component
 * Recent activity feed with dark glassmorphism styling
 */

import { Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecentActivityProps {
  categoryLeads: any[];
}

export function RecentActivity({ categoryLeads }: RecentActivityProps) {
  return (
    <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
      <CardHeader className="pb-4 border-b border-gray-800/50">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-2">
          {categoryLeads && categoryLeads.length > 0 ? (
            categoryLeads.slice(0, 5).map((lead: any) => (
              <Link key={lead.id} href={`/crm/job/${lead.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group border border-transparent hover:border-gray-700/50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#009688] flex items-center justify-center shadow-lg shadow-teal-900/20 group-hover:shadow-teal-900/40 transition-shadow">
                    <span className="text-black font-bold text-xs">
                      {lead.fullName?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate transition-colors">
                      {lead.fullName}
                    </p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-400">{lead.status}</p>
                  </div>
                  <div className="text-xs text-gray-600 group-hover:text-gray-500">
                    2h ago
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4 text-sm">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
