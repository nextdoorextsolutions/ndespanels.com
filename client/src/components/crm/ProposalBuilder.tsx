import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, CheckCircle, XCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface ProposalBuilderProps {
  jobId: number;
  roofSquares: number; // From solarApiData
  currentPricePerSq?: string | null;
  currentTotalPrice?: string | null;
  currentCounterPrice?: string | null;
  currentPriceStatus?: string;
  userRole: string;
  onUpdate?: () => void;
}

export function ProposalBuilder({
  jobId,
  roofSquares,
  currentPricePerSq,
  currentTotalPrice,
  currentCounterPrice,
  currentPriceStatus = "draft",
  userRole,
  onUpdate,
}: ProposalBuilderProps) {
  const [pricePerSq, setPricePerSq] = useState(currentPricePerSq || "");
  const [counterPrice, setCounterPrice] = useState("");
  const [showCounterInput, setShowCounterInput] = useState(false);

  const utils = trpc.useUtils();

  // Calculate total price
  const calculateTotal = (pricePerSq: string): number => {
    const price = parseFloat(pricePerSq);
    if (isNaN(price)) return 0;
    return price * roofSquares;
  };

  const totalPrice = calculateTotal(pricePerSq);
  const pricePerSqNum = parseFloat(pricePerSq) || 0;

  // Update proposal mutation
  // @ts-ignore - procedure exists in routers.ts but types not inferred due to @ts-nocheck
  const updateProposal = (trpc.crm as any).updateProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal updated successfully");
      onUpdate?.();
      utils.crm.getJobDetail.invalidate({ id: jobId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Determine button state based on price
  const getButtonConfig = () => {
    if (pricePerSqNum < 450) {
      return {
        disabled: true,
        label: "Below Minimum Floor ($450)",
        variant: "destructive" as const,
        color: "bg-red-500",
      };
    } else if (pricePerSqNum >= 450 && pricePerSqNum < 500) {
      return {
        disabled: false,
        label: "Submit for Approval",
        variant: "default" as const,
        color: "bg-yellow-500 hover:bg-yellow-600",
      };
    } else {
      return {
        disabled: false,
        label: "Save & Generate",
        variant: "default" as const,
        color: "bg-green-500 hover:bg-green-600",
      };
    }
  };

  const buttonConfig = getButtonConfig();

  // Handle save/submit
  const handleSave = () => {
    if (pricePerSqNum < 450) {
      toast.error("Price per square must be at least $450");
      return;
    }

    const status = pricePerSqNum >= 500 ? "approved" : "pending_approval";

    updateProposal.mutate({
      jobId,
      pricePerSq: pricePerSq,
      totalPrice: totalPrice.toString(),
      priceStatus: status,
    });
  };

  // Owner approves
  const handleApprove = () => {
    updateProposal.mutate({
      jobId,
      priceStatus: "approved",
    });
  };

  // Owner denies and counters
  const handleCounter = () => {
    const counterPriceNum = parseFloat(counterPrice);
    if (isNaN(counterPriceNum) || counterPriceNum < 450) {
      toast.error("Counter price must be at least $450");
      return;
    }

    updateProposal.mutate({
      jobId,
      counterPrice: counterPrice,
      priceStatus: "negotiation",
    });

    setShowCounterInput(false);
    setCounterPrice("");
  };

  // Rep accepts counter
  const handleAcceptCounter = () => {
    updateProposal.mutate({
      jobId,
      pricePerSq: currentCounterPrice || "",
      totalPrice: (parseFloat(currentCounterPrice || "0") * roofSquares).toString(),
      counterPrice: null,
      priceStatus: "approved",
    });
  };

  // Rep denies counter and resets
  const handleDenyCounter = () => {
    if (confirm("This will reset the proposal to draft. Continue?")) {
      updateProposal.mutate({
        jobId,
        pricePerSq: null,
        totalPrice: null,
        counterPrice: null,
        priceStatus: "draft",
      });
      setPricePerSq("");
    }
  };

  // STATE A: DRAFT (Sales Rep)
  if (currentPriceStatus === "draft" && (userRole === "sales_rep" || userRole === "team_lead" || userRole === "owner" || userRole === "office")) {
    return (
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign className="w-5 h-5 text-[#00d4aa]" />
            Proposal Builder
          </CardTitle>
          <CardDescription className="text-slate-400">
            Set pricing for this {roofSquares.toFixed(1)} square roof
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="pricePerSq" className="text-white">
              Price Per Square
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="pricePerSq"
                type="number"
                step="0.01"
                min="0"
                value={pricePerSq}
                onChange={(e) => setPricePerSq(e.target.value)}
                placeholder="Enter price per square"
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            {pricePerSqNum > 0 && pricePerSqNum < 450 && (
              <p className="text-sm text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Minimum floor is $450 per square
              </p>
            )}
          </div>

          {/* Total Price Display */}
          {totalPrice > 0 && (
            <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Job Price</span>
                <span className="text-2xl font-bold text-[#00d4aa]">
                  ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {roofSquares.toFixed(1)} squares × ${pricePerSqNum.toFixed(2)}/sq
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleSave}
            disabled={buttonConfig.disabled || !pricePerSq || updateProposal.isLoading}
            className={`w-full ${buttonConfig.color} text-white font-semibold`}
          >
            {updateProposal.isLoading ? "Saving..." : buttonConfig.label}
          </Button>

          {/* Pricing Guide */}
          <div className="text-xs text-slate-400 space-y-1 p-3 bg-slate-900 rounded border border-slate-700">
            <div className="font-semibold text-white mb-2">Pricing Guide:</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>&lt; $450: Below minimum floor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>$450-$499: Requires owner approval</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>≥ $500: Auto-approved</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // STATE B: PENDING APPROVAL (Owner View)
  if (currentPriceStatus === "pending_approval" && (userRole === "owner" || userRole === "office")) {
    const requestedPrice = parseFloat(currentPricePerSq || "0");
    const requestedTotal = parseFloat(currentTotalPrice || "0");

    return (
      <Card className="border-yellow-500 bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Approval Required
          </CardTitle>
          <CardDescription className="text-slate-400">
            Sales rep submitted a proposal below $500/sq
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Requested Price Display */}
          <div className="p-4 bg-slate-700 rounded-lg border border-yellow-500">
            <div className="text-sm text-slate-400 mb-2">Rep Requested:</div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-white">
                ${requestedPrice.toFixed(2)} per square
              </span>
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                Pending
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-600">
              <span className="text-slate-400">Total Job Price</span>
              <span className="text-2xl font-bold text-yellow-500">
                ${requestedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {roofSquares.toFixed(1)} squares × ${requestedPrice.toFixed(2)}/sq
            </div>
          </div>

          {/* Counter Offer Input */}
          {showCounterInput && (
            <div className="space-y-2 p-4 bg-slate-900 rounded-lg border border-slate-600">
              <Label htmlFor="counterPrice" className="text-white">
                Counter Offer ($/sq)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="counterPrice"
                  type="number"
                  step="0.01"
                  min="450"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="Enter counter price"
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              {parseFloat(counterPrice) > 0 && (
                <div className="text-sm text-slate-400">
                  New Total: ${(parseFloat(counterPrice) * roofSquares).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleCounter}
                  disabled={!counterPrice || updateProposal.isLoading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Submit Counter
                </Button>
                <Button
                  onClick={() => {
                    setShowCounterInput(false);
                    setCounterPrice("");
                  }}
                  variant="outline"
                  className="border-slate-600 text-slate-400 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showCounterInput && (
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={updateProposal.isLoading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve ${requestedPrice.toFixed(2)}
              </Button>
              <Button
                onClick={() => setShowCounterInput(true)}
                disabled={updateProposal.isLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Deny & Counter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // STATE C: NEGOTIATION (Sales Rep View)
  if (currentPriceStatus === "negotiation" && (userRole === "sales_rep" || userRole === "team_lead")) {
    const ownerCounter = parseFloat(currentCounterPrice || "0");
    const counterTotal = ownerCounter * roofSquares;

    return (
      <Card className="border-orange-500 bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Counter Offer Received
          </CardTitle>
          <CardDescription className="text-slate-400">
            Owner has proposed a different price
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Counter Offer Display */}
          <div className="p-4 bg-slate-700 rounded-lg border border-orange-500">
            <div className="text-sm text-slate-400 mb-2">Owner Countered:</div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-white">
                ${ownerCounter.toFixed(2)} per square
              </span>
              <Badge variant="outline" className="border-orange-500 text-orange-500">
                Negotiation
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-600">
              <span className="text-slate-400">Total Job Price</span>
              <span className="text-2xl font-bold text-orange-500">
                ${counterTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {roofSquares.toFixed(1)} squares × ${ownerCounter.toFixed(2)}/sq
            </div>
          </div>

          {/* Comparison */}
          <div className="p-3 bg-slate-900 rounded border border-slate-700 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Your Request:</span>
              <span className="text-white">${parseFloat(currentPricePerSq || "0").toFixed(2)}/sq</span>
            </div>
            <div className="flex justify-between text-slate-400 mt-1">
              <span>Owner Counter:</span>
              <span className="text-orange-500 font-semibold">${ownerCounter.toFixed(2)}/sq</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleAcceptCounter}
              disabled={updateProposal.isLoading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept ${ownerCounter.toFixed(2)}
            </Button>
            <Button
              onClick={handleDenyCounter}
              disabled={updateProposal.isLoading}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deny / Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // STATE D: APPROVED (All Users)
  if (currentPriceStatus === "approved") {
    const approvedPrice = parseFloat(currentPricePerSq || "0");
    const approvedTotal = parseFloat(currentTotalPrice || "0");

    return (
      <Card className="border-green-500 bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Proposal Approved
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ready to generate final proposal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approved Price Display */}
          <div className="p-4 bg-slate-700 rounded-lg border border-green-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-white">
                ${approvedPrice.toFixed(2)} per square
              </span>
              <Badge className="bg-green-500 text-white">
                Approved
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-600">
              <span className="text-slate-400">Total Job Price</span>
              <span className="text-2xl font-bold text-green-500">
                ${approvedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {roofSquares.toFixed(1)} squares × ${approvedPrice.toFixed(2)}/sq
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-3 bg-green-900/20 rounded border border-green-500/30 text-sm text-green-400">
            <div className="font-semibold mb-1">✓ Pricing Approved</div>
            <div className="text-xs text-slate-400">
              You can now generate the final proposal document for the customer.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for owner viewing negotiation state
  if (currentPriceStatus === "negotiation" && (userRole === "owner" || userRole === "office")) {
    return (
      <Card className="border-orange-500 bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Awaiting Rep Response
          </CardTitle>
          <CardDescription className="text-slate-400">
            Counter offer sent to sales rep
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-slate-700 rounded-lg border border-orange-500">
            <div className="text-sm text-slate-400 mb-2">Your Counter Offer:</div>
            <div className="text-2xl font-bold text-orange-500">
              ${parseFloat(currentCounterPrice || "0").toFixed(2)} per square
            </div>
            <div className="text-sm text-slate-500 mt-2">
              Total: ${(parseFloat(currentCounterPrice || "0") * roofSquares).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
