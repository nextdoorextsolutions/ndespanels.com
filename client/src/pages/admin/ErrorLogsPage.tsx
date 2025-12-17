import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, Eye, RefreshCw } from "lucide-react";
import CRMLayout from "@/components/crm/CRMLayout";

export default function ErrorLogsPage() {
  const [showStackTrace, setShowStackTrace] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");

  const { data: errorLogs, isLoading, refetch } = trpc.utility.getErrorLogs.useQuery({
    resolved: filter === "all" ? undefined : filter === "resolved",
    limit: 100,
    offset: 0,
  });

  const resolveError = trpc.utility.resolveError.useMutation({
    onSuccess: () => {
      toast.success("Error marked as resolved");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const selectedError = errorLogs?.find(log => log.id === showStackTrace);

  const unresolvedCount = errorLogs?.filter(log => !log.resolved).length || 0;
  const resolvedCount = errorLogs?.filter(log => log.resolved).length || 0;

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Error Logs</h1>
            <p className="text-sm text-slate-400">System error reports and crash logs</p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Errors</p>
                  <p className="text-2xl font-bold text-white">{errorLogs?.length || 0}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Unresolved</p>
                  <p className="text-2xl font-bold text-red-400">{unresolvedCount}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Resolved</p>
                  <p className="text-2xl font-bold text-green-400">{resolvedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === "unresolved" ? "default" : "outline"}
            onClick={() => setFilter("unresolved")}
            className={filter === "unresolved" ? "bg-red-600 hover:bg-red-700" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
          >
            Unresolved ({unresolvedCount})
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-[#00d4aa] hover:bg-[#00b894] text-black" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
          >
            All ({errorLogs?.length || 0})
          </Button>
          <Button
            variant={filter === "resolved" ? "default" : "outline"}
            onClick={() => setFilter("resolved")}
            className={filter === "resolved" ? "bg-green-600 hover:bg-green-700" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
          >
            Resolved ({resolvedCount})
          </Button>
        </div>

        {/* Error Logs Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Error Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
              </div>
            ) : errorLogs && errorLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-600">
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">User</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Error Message</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Page</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4 text-sm text-slate-300">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-sm">
                          <div>
                            <p className="text-white font-medium">
                              {log.userId ? `User #${log.userId}` : "Anonymous"}
                            </p>
                            {log.userRole && (
                              <p className="text-xs text-slate-400">{log.userRole}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-300 max-w-md">
                          <p className="truncate">{log.errorMessage}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-400 max-w-xs">
                          <p className="truncate">{log.pageUrl || "N/A"}</p>
                        </td>
                        <td className="p-4">
                          {log.resolved ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Resolved
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              Unresolved
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowStackTrace(log.id)}
                              className="text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {!log.resolved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resolveError.mutate({ errorId: log.id })}
                                disabled={resolveError.isPending}
                                className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-slate-400 text-lg">No error logs found</p>
                <p className="text-slate-500 text-sm">
                  {filter === "unresolved" ? "All errors have been resolved!" : "No errors to display"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stack Trace Modal */}
        <Dialog open={showStackTrace !== null} onOpenChange={() => setShowStackTrace(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                Error Details #{selectedError?.id}
              </DialogTitle>
            </DialogHeader>
            
            {selectedError && (
              <div className="space-y-4">
                {/* Error Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Date</p>
                    <p className="text-white">{new Date(selectedError.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">User</p>
                    <p className="text-white">
                      {selectedError.userId ? `User #${selectedError.userId}` : "Anonymous"}
                      {selectedError.userRole && ` (${selectedError.userRole})`}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-400">Page URL</p>
                    <p className="text-white break-all">{selectedError.pageUrl || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-400">Browser Info</p>
                    <p className="text-white text-sm">{selectedError.browserInfo || "N/A"}</p>
                  </div>
                </div>

                {/* Error Message */}
                <div>
                  <p className="text-sm text-slate-400 mb-2">Error Message</p>
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                    <p className="text-red-400 font-mono text-sm">{selectedError.errorMessage}</p>
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedError.stackTrace && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Stack Trace</p>
                    <div className="bg-slate-900 border border-slate-600 rounded p-4 overflow-x-auto">
                      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                        {selectedError.stackTrace}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => setShowStackTrace(null)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </Button>
                  {!selectedError.resolved && (
                    <Button
                      onClick={() => {
                        resolveError.mutate({ errorId: selectedError.id });
                        setShowStackTrace(null);
                      }}
                      disabled={resolveError.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}
