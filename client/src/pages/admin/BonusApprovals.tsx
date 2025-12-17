import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, FileText, User, MapPin, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import { format } from "date-fns";

export default function BonusApprovals() {
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [denialReason, setDenialReason] = useState("");

  // Get pending requests
  const { data: pendingRequests, isLoading, refetch } = trpc.commissions.getPendingRequests.useQuery();

  // Review mutation
  const reviewRequest = trpc.commissions.reviewRequest.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
      setDenyDialogOpen(false);
      setSelectedRequestId(null);
      setDenialReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = (requestId: number) => {
    reviewRequest.mutate({
      requestId,
      approved: true,
    });
  };

  const handleDenyClick = (requestId: number) => {
    setSelectedRequestId(requestId);
    setDenyDialogOpen(true);
  };

  const handleDenyConfirm = () => {
    if (!selectedRequestId) return;
    
    if (!denialReason.trim()) {
      toast.error("Please provide a reason for denial");
      return;
    }

    reviewRequest.mutate({
      requestId: selectedRequestId,
      approved: false,
      reason: denialReason,
    });
  };

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Bonus Approvals</h1>
          <p className="text-slate-400">Review and approve commission requests from your team</p>
        </div>

        {/* Pending Requests */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#00d4aa]" />
              Pending Requests
              {pendingRequests && pendingRequests.length > 0 && (
                <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 ml-2">
                  {pendingRequests.length} Pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
              </div>
            ) : pendingRequests && pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.requestId}
                    className="p-4 bg-slate-700/30 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-4">
                      {/* Request Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-[#00d4aa] flex items-center justify-center">
                            <User className="w-5 h-5 text-black" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{request.userName}</h3>
                            <p className="text-xs text-slate-400">{request.userEmail}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          {/* Job Info */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-white">{request.jobName}</p>
                                <p className="text-xs text-slate-400">{request.jobAddress}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-white font-semibold">
                                ${request.checkAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Document Status */}
                          <div>
                            <p className="text-xs font-semibold text-slate-300 mb-2">Documents Verified?</p>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {request.documentStatus.hasContract ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span className={`text-sm ${
                                  request.documentStatus.hasContract ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  Contract
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {request.documentStatus.hasProposal ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span className={`text-sm ${
                                  request.documentStatus.hasProposal ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  Proposal
                                </span>
                              </div>
                              {!request.documentStatus.allRequiredPresent && (
                                <div className="flex items-start gap-2 mt-2 p-2 bg-red-500/10 rounded border border-red-500/30">
                                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-red-400">
                                    Missing required documents
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-600">
                          <span>Job Status: <span className="text-white capitalize">{request.jobStatus}</span></span>
                          <span>Submitted: {format(new Date(request.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                          {request.paymentId && (
                            <span>Payment ID: <span className="text-white">{request.paymentId}</span></span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => handleApprove(request.requestId)}
                          disabled={reviewRequest.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleDenyClick(request.requestId)}
                          disabled={reviewRequest.isPending}
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm mt-1">No pending commission requests to review</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deny Dialog */}
        <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Deny Commission Request</DialogTitle>
              <DialogDescription className="text-slate-400">
                Please provide a reason for denying this request. The sales rep will see this message.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="e.g., Missing signed contract, Payment not verified, etc."
                className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDenyDialogOpen(false);
                  setDenialReason("");
                }}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDenyConfirm}
                disabled={reviewRequest.isPending || !denialReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {reviewRequest.isPending ? "Denying..." : "Confirm Denial"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}
