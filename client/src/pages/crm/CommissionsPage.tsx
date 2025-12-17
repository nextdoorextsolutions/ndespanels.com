import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Trophy, DollarSign, CheckCircle, Clock, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import { format } from "date-fns";

export default function CommissionsPage() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Get weekly progress
  const { data: progress, isLoading: progressLoading } = trpc.commissions.getWeeklyProgress.useQuery({});

  // Get my commission requests history
  const { data: myRequests, refetch: refetchRequests } = trpc.commissions.getMyRequests.useQuery();

  // Submit for bonus mutation
  const submitForBonus = trpc.commissions.submitForBonus.useMutation({
    onSuccess: () => {
      toast.success("Commission request submitted for review!");
      refetchRequests();
      setSelectedJobId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Get eligible jobs from request history (jobs that are closed but not yet submitted)
  // For now, we'll show a simplified view - in production, you'd query closed_deal jobs
  const submittedJobIds = new Set(myRequests?.map(r => r.jobId) || []);
  
  // Placeholder for eligible jobs - in production, fetch from crm.getStats or similar
  const eligibleJobs: Array<{
    id: number;
    fullName: string;
    address: string;
    totalPrice: string | null;
    createdAt: Date;
  }> = [];

  // Calculate progress percentage
  const progressPercent = progress?.nextTier 
    ? ((progress.approvedDealsThisWeek / progress.nextTier.requiredDeals) * 100)
    : 100;

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">My Commissions</h1>
          <p className="text-slate-400">Track your weekly bonus progress and submit eligible deals</p>
        </div>

        {/* Weekly Bonus Tracker */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Weekly Bonus Tracker
            </CardTitle>
            <p className="text-sm text-slate-400">
              Week of {progress?.weekStart && format(new Date(progress.weekStart), "MMM dd")} - {progress?.weekEnd && format(new Date(progress.weekEnd), "MMM dd, yyyy")}
            </p>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
              </div>
            ) : progress ? (
              <div className="space-y-4">
                {/* Current Progress */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-300">
                      {progress.approvedDealsThisWeek} / {progress.nextTier?.requiredDeals || progress.currentTier?.requiredDeals || 0} Deals
                    </span>
                    <span className="text-sm font-semibold text-[#00d4aa]">
                      {progress.nextTier 
                        ? `$${progress.nextTier.bonusAmount.toLocaleString()} Bonus`
                        : progress.currentTier
                        ? `$${progress.currentTier.bonusAmount.toLocaleString()} Achieved!`
                        : 'No bonus tiers set'}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  {progress.nextTier && (
                    <p className="text-xs text-slate-400 mt-2">
                      {progress.nextTier.dealsRemaining} more {progress.nextTier.dealsRemaining === 1 ? 'deal' : 'deals'} to unlock ${progress.nextTier.bonusAmount.toLocaleString()} bonus
                    </p>
                  )}
                </div>

                {/* All Tiers */}
                {progress.allTiers && progress.allTiers.length > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-sm font-semibold text-slate-300 mb-3">Bonus Tiers</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {progress.allTiers.map((tier, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            tier.achieved
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-slate-700/30 border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-400">
                                {tier.requiredDeals} {tier.requiredDeals === 1 ? 'Deal' : 'Deals'}
                              </p>
                              <p className="text-lg font-bold text-white">
                                ${tier.bonusAmount.toLocaleString()}
                              </p>
                            </div>
                            {tier.achieved && (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                No bonus tiers configured. Contact your manager.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligible Checks */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#00d4aa]" />
              Eligible Checks
            </CardTitle>
            <p className="text-sm text-slate-400">
              Closed deals that haven't been submitted for commission yet
            </p>
          </CardHeader>
          <CardContent>
            {eligibleJobs.length > 0 ? (
              <div className="space-y-3">
                {eligibleJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600 hover:border-[#00d4aa]/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{job.fullName}</h3>
                        <Badge variant="outline" className="border-green-500/30 text-green-400">
                          Closed Deal
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-1">{job.address}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.totalPrice ? `$${parseFloat(job.totalPrice).toLocaleString()}` : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.createdAt && format(new Date(job.createdAt), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedJobId(job.id);
                        submitForBonus.mutate({ jobId: job.id });
                      }}
                      disabled={submitForBonus.isPending && selectedJobId === job.id}
                      className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                    >
                      {submitForBonus.isPending && selectedJobId === job.id ? (
                        "Submitting..."
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Add to Weekly Bonus
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No eligible checks available</p>
                <p className="text-sm mt-1">Close more deals to earn commissions!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request History */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Request History</CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests && myRequests.length > 0 ? (
              <div className="overflow-x-auto rounded-lg">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-600">
                      <th className="text-left p-3 text-sm font-semibold text-slate-300">Job</th>
                      <th className="text-left p-3 text-sm font-semibold text-slate-300">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold text-slate-300">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-slate-300">Submitted</th>
                      <th className="text-left p-3 text-sm font-semibold text-slate-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((request) => (
                      <tr key={request.requestId} className="border-b border-slate-700">
                        <td className="p-3">
                          <div>
                            <p className="text-white font-medium">{request.jobName}</p>
                            <p className="text-xs text-slate-400">{request.jobAddress}</p>
                          </div>
                        </td>
                        <td className="p-3 text-white">
                          ${request.checkAmount.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              request.status === 'approved'
                                ? 'border-green-500/30 text-green-400'
                                : request.status === 'denied'
                                ? 'border-red-500/30 text-red-400'
                                : 'border-yellow-500/30 text-yellow-400'
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-slate-400">
                          {format(new Date(request.createdAt), "MMM dd, yyyy")}
                        </td>
                        <td className="p-3">
                          {request.denialReason && (
                            <div className="flex items-start gap-2 text-xs text-red-400">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{request.denialReason}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                No commission requests yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
