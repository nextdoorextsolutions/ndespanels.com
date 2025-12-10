import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText,
  Shield,
  TrendingUp,
  Calculator
} from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import { convertSqFeetToSquares, SQUARE_FEET_PER_SQUARE } from "@/utils/roofingMath";

interface ProposalCalculatorProps {
  jobId: number;
  roofArea?: number; // From solarApiData
  manualAreaSqFt?: number; // Manual entry fallback
  solarCoverage?: boolean; // Whether solar data is available
  currentPricePerSq?: string | null;
  currentTotalPrice?: string | null;
  currentCounterPrice?: string | null;
  currentPriceStatus?: string;
  userRole: string;
  onUpdate?: () => void;
}

export function ProposalCalculator({
  jobId,
  roofArea,
  manualAreaSqFt,
  solarCoverage = false,
  currentPricePerSq,
  currentTotalPrice,
  currentCounterPrice,
  currentPriceStatus = "draft",
  userRole,
  onUpdate,
}: ProposalCalculatorProps) {
  const [pricePerSq, setPricePerSq] = useState(currentPricePerSq || "");
  const [counterPrice, setCounterPrice] = useState("");
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [dealType, setDealType] = useState<"insurance" | "cash" | "financed">("cash");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>();
  const [manualSqFt, setManualSqFt] = useState<string>(manualAreaSqFt?.toString() || "");

  const utils = trpc.useUtils();

  // Calculate roof squares using centralized utility
  // Priority: Manual override > Solar data > Manual fallback
  const manualOverride = parseFloat(manualSqFt) || 0;
  const finalSqFt = manualOverride > 0 ? manualOverride : (roofArea || manualAreaSqFt || 0);
  const roofSquares = finalSqFt / SQUARE_FEET_PER_SQUARE;

  // Calculate total price
  const pricePerSqNum = parseFloat(pricePerSq) || 0;
  const totalPrice = pricePerSqNum * roofSquares;

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

  // Generate proposal PDF mutation (preview only)
  // @ts-ignore - procedure exists in routers.ts but types not inferred due to @ts-nocheck
  const generateProposal = (trpc.crm as any).generateProposal.useMutation({
    onSuccess: (data: any) => {
      toast.success("Opening signature pad...");
      
      // Convert base64 PDF to blob URL for preview
      if (data.pdfPreview) {
        const binaryString = atob(data.pdfPreview);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
      }
      
      // Open signature pad for customer to sign
      setShowSignaturePad(true);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Generate signed proposal and save to documents
  // @ts-ignore - procedure exists in routers.ts but types not inferred due to @ts-nocheck
  const generateSignedProposal = (trpc.crm as any).generateSignedProposal.useMutation({
    onSuccess: () => {
      toast.success("Signed proposal saved to Documents!");
      setShowSignaturePad(false);
      onUpdate?.();
      utils.crm.getJobDetail.invalidate({ id: jobId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Handle signature completion
  const handleSignatureComplete = (signatureDataUrl: string) => {
    generateSignedProposal.mutate({
      jobId,
      customerSignature: signatureDataUrl,
    });
  };

  // Determine pricing zone
  const getPricingZone = () => {
    if (pricePerSqNum < 450) {
      return {
        zone: "red",
        label: "Below Minimum",
        color: "bg-red-500",
        textColor: "text-red-400",
        borderColor: "border-red-500",
        icon: XCircle,
        message: "Price per square must be at least $450",
      };
    } else if (pricePerSqNum >= 450 && pricePerSqNum < 500) {
      return {
        zone: "yellow",
        label: "Low Margin",
        color: "bg-yellow-500",
        textColor: "text-yellow-400",
        borderColor: "border-yellow-500",
        icon: AlertTriangle,
        message: "Requires owner approval for pricing below $500/sq",
      };
    } else {
      return {
        zone: "green",
        label: "Healthy Margin",
        color: "bg-green-500",
        textColor: "text-green-400",
        borderColor: "border-green-500",
        icon: CheckCircle,
        message: "Good pricing - ready to generate contract",
      };
    }
  };

  const pricingZone = getPricingZone();
  const isOwner = userRole === "owner" || userRole === "office";

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

  // Generate contract (only for approved or owner override)
  const handleGenerateContract = () => {
    if (pricePerSqNum < 450) {
      toast.error("Cannot generate contract below minimum price");
      return;
    }

    if (pricingZone.zone === "yellow" && !isOwner) {
      toast.error("Owner approval required for this pricing");
      return;
    }

    // Update to approved and generate
    updateProposal.mutate({
      jobId,
      pricePerSq: pricePerSq,
      totalPrice: totalPrice.toString(),
      priceStatus: "approved",
    });

    toast.success("Contract generation initiated");
    // TODO: Implement actual contract generation
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

  // Determine coverage badge
  const getCoverageBadge = () => {
    if (manualOverride > 0) {
      return {
        icon: "👤",
        label: "Manual Override",
        color: "bg-yellow-500",
        textColor: "text-yellow-100"
      };
    }
    if (solarCoverage && roofArea) {
      return {
        icon: "⚡",
        label: "Solar Measured",
        color: "bg-green-500",
        textColor: "text-green-100"
      };
    }
    return {
      icon: "📏",
      label: "Manual Measure Required",
      color: "bg-red-500",
      textColor: "text-red-100"
    };
  };

  const coverageBadge = getCoverageBadge();

  // Handle manual override change
  const handleManualSqFtChange = (value: string) => {
    setManualSqFt(value);
    const sqFt = parseFloat(value) || 0;
    if (sqFt > 0) {
      // Save manual override to database
      updateProposal.mutate({
        jobId,
        manualAreaSqFt: sqFt,
      });
    }
  };

  // No roof data available
  if (!finalSqFt) {
    return (
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calculator className="w-5 h-5 text-[#00d4aa]" />
            Proposal Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-slate-700 border-slate-600">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <AlertDescription className="text-slate-300">
              Roof area data is required to calculate pricing. Please add solar API data or manual roof measurements.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // STATE A: DRAFT (Initial Entry)
  if (currentPriceStatus === "draft") {
    return (
      <Card className={`border-slate-700 bg-slate-800 ${pricePerSqNum > 0 ? `border-l-4 ${pricingZone.borderColor}` : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calculator className="w-5 h-5 text-[#00d4aa]" />
            Proposal Calculator
          </CardTitle>
          <CardDescription className="text-slate-400">
            Calculate pricing for {roofSquares.toFixed(1)} square roof
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Override Input */}
          <div className="space-y-2">
            <Label htmlFor="manualSqFt" className="text-white flex items-center gap-2">
              Manual Roof Area (sq ft)
              <Badge className={`${coverageBadge.color} ${coverageBadge.textColor} text-xs`}>
                {coverageBadge.icon} {coverageBadge.label}
              </Badge>
            </Label>
            <Input
              id="manualSqFt"
              type="number"
              step="1"
              min="0"
              value={manualSqFt}
              onChange={(e) => handleManualSqFtChange(e.target.value)}
              placeholder={roofArea ? `Auto: ${roofArea.toFixed(0)} sq ft` : "Enter manual area"}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400">
              {manualOverride > 0 
                ? "Using manual override value" 
                : roofArea 
                  ? "Leave blank to use solar-measured area" 
                  : "Manual measurement required"}
            </p>
          </div>

          {/* Roof Size Display */}
          <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Roof Size</p>
                <p className="text-2xl font-bold text-white">{roofSquares.toFixed(1)} squares</p>
                <p className="text-xs text-slate-500 mt-1">{finalSqFt.toFixed(0)} sq ft</p>
              </div>
              <Shield className="w-12 h-12 text-slate-600" />
            </div>
          </div>

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
                className="pl-10 bg-slate-700 border-slate-600 text-white text-lg font-semibold"
              />
            </div>
          </div>

          {/* Pricing Zone Indicator */}
          {pricePerSqNum > 0 && (
            <Alert className={`${pricingZone.color}/10 border-${pricingZone.color}`}>
              <pricingZone.icon className={`w-4 h-4 ${pricingZone.textColor}`} />
              <AlertDescription className="text-white">
                <span className="font-semibold">{pricingZone.label}:</span> {pricingZone.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Total Price Display */}
          {totalPrice > 0 && (
            <div className={`p-4 bg-slate-700 rounded-lg border-2 ${pricingZone.borderColor}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Total Job Price</span>
                <Badge className={`${pricingZone.color} text-white`}>
                  {pricingZone.label}
                </Badge>
              </div>
              <div className="text-3xl font-bold text-[#00d4aa]">
                ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {roofSquares.toFixed(1)} squares × ${pricePerSqNum.toFixed(2)}/sq
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Green Zone: Generate Contract */}
            {pricingZone.zone === "green" && (
              <Button
                onClick={handleGenerateContract}
                disabled={!pricePerSq || updateProposal.isLoading}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                {updateProposal.isLoading ? "Saving..." : "Save & Generate Contract"}
              </Button>
            )}

            {/* Yellow Zone: Submit for Approval (or Owner Override) */}
            {pricingZone.zone === "yellow" && (
              <>
                {isOwner ? (
                  <Button
                    onClick={handleGenerateContract}
                    disabled={!pricePerSq || updateProposal.isLoading}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {updateProposal.isLoading ? "Saving..." : "Owner Override - Generate Contract"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={!pricePerSq || updateProposal.isLoading}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {updateProposal.isLoading ? "Submitting..." : "Submit for Owner Approval"}
                  </Button>
                )}
              </>
            )}

            {/* Red Zone: Disabled */}
            {pricingZone.zone === "red" && (
              <Button
                disabled
                className="w-full bg-red-500/50 text-white font-semibold cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Below Minimum - Cannot Proceed
              </Button>
            )}
          </div>

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
              <span>≥ $500: Healthy margin - auto-approved</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // STATE B: PENDING APPROVAL (Owner View)
  if (currentPriceStatus === "pending_approval" && isOwner) {
    const requestedPrice = parseFloat(currentPricePerSq || "0");
    const requestedTotal = parseFloat(currentTotalPrice || "0");

    return (
      <Card className="border-yellow-500 bg-slate-800 border-l-4">
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
          <div className="p-4 bg-slate-700 rounded-lg border-2 border-yellow-500">
            <div className="text-sm text-slate-400 mb-2">Rep Requested:</div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-semibold text-white">
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
  if (currentPriceStatus === "negotiation" && !isOwner) {
    const ownerCounter = parseFloat(currentCounterPrice || "0");
    const counterTotal = ownerCounter * roofSquares;

    return (
      <Card className="border-orange-500 bg-slate-800 border-l-4">
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
          <div className="p-4 bg-slate-700 rounded-lg border-2 border-orange-500">
            <div className="text-sm text-slate-400 mb-2">Owner Countered:</div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-semibold text-white">
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

  // STATE D: APPROVED
  if (currentPriceStatus === "approved") {
    const approvedPrice = parseFloat(currentPricePerSq || "0");
    const approvedTotal = parseFloat(currentTotalPrice || "0");

    return (
      <Card className="border-green-500 bg-slate-800 border-l-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Proposal Approved
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ready to generate final contract
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approved Price Display */}
          <div className="p-4 bg-slate-700 rounded-lg border-2 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-semibold text-white">
                ${approvedPrice.toFixed(2)} per square
              </span>
              <Badge className="bg-green-500 text-white">
                Approved
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-600">
              <span className="text-slate-400">Total Job Price</span>
              <span className="text-3xl font-bold text-green-500">
                ${approvedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {roofSquares.toFixed(1)} squares × ${approvedPrice.toFixed(2)}/sq
            </div>
          </div>

          {/* Generate Contract Button */}
          <Button
            onClick={() => generateProposal.mutate({ jobId })}
            disabled={generateProposal.isLoading}
            className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
          >
            <FileText className="w-4 h-4 mr-2" />
            {generateProposal.isLoading ? "Generating..." : "Generate Contract"}
          </Button>

          {/* Success Message */}
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
  if (currentPriceStatus === "negotiation" && isOwner) {
    return (
      <Card className="border-orange-500 bg-slate-800 border-l-4">
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
          <div className="p-4 bg-slate-700 rounded-lg border-2 border-orange-500">
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

  // Fallback for pending approval (non-owner view)
  if (currentPriceStatus === "pending_approval" && !isOwner) {
    return (
      <Card className="border-yellow-500 bg-slate-800 border-l-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Awaiting Owner Approval
          </CardTitle>
          <CardDescription className="text-slate-400">
            Your proposal has been submitted for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-slate-700 rounded-lg border-2 border-yellow-500">
            <div className="text-sm text-slate-400 mb-2">Submitted Price:</div>
            <div className="text-2xl font-bold text-yellow-500">
              ${parseFloat(currentPricePerSq || "0").toFixed(2)} per square
            </div>
            <div className="text-sm text-slate-500 mt-2">
              Total: ${parseFloat(currentTotalPrice || "0").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <Alert className="mt-4 bg-yellow-900/20 border-yellow-500/30">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <AlertDescription className="text-slate-300">
              Owner will review and either approve or counter your proposal.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Signature Pad Dialog */}
      <SignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSignatureComplete={handleSignatureComplete}
        customerName={customerName || "Customer"}
        documentType={dealType}
        pdfPreviewUrl={pdfPreviewUrl}
      />
    </>
  );
}
