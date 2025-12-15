import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Edit2, Save, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface InsuranceInfoCardProps {
  jobId: number;
  insuranceCarrier?: string | null;
  policyNumber?: string | null;
  claimNumber?: string | null;
  deductible?: string | null;
  onUpdate?: () => void;
}

export function InsuranceInfoCard({
  jobId,
  insuranceCarrier,
  policyNumber,
  claimNumber,
  deductible,
  onUpdate,
}: InsuranceInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    insuranceCarrier: insuranceCarrier || "",
    policyNumber: policyNumber || "",
    claimNumber: claimNumber || "",
    deductible: deductible || "",
  });

  const utils = trpc.useUtils();

  const updateInsurance = trpc.crm.updateInsuranceInfo.useMutation({
    onSuccess: () => {
      toast.success("Insurance information updated");
      setIsEditing(false);
      onUpdate?.();
      utils.crm.getJobDetail.invalidate({ id: jobId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    console.log('[InsuranceInfo] Saving:', {
      insuranceCarrier: formData.insuranceCarrier,
      policyNumber: formData.policyNumber,
      claimNumber: formData.claimNumber,
      deductible: formData.deductible,
    });
    updateInsurance.mutate({
      id: jobId,
      insuranceCarrier: formData.insuranceCarrier.trim() || null,
      policyNumber: formData.policyNumber.trim() || null,
      claimNumber: formData.claimNumber.trim() || null,
      deductible: formData.deductible ? parseFloat(formData.deductible) : null,
    });
  };

  const handleCancel = () => {
    setFormData({
      insuranceCarrier: insuranceCarrier || "",
      policyNumber: policyNumber || "",
      claimNumber: claimNumber || "",
      deductible: deductible || "",
    });
    setIsEditing(false);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <CardTitle className="text-white">Insurance Information</CardTitle>
              <CardDescription className="text-slate-400">
                Insurance carrier and claim details
              </CardDescription>
            </div>
          </div>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateInsurance.isPending}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateInsurance.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            {/* Insurance Carrier */}
            <div className="space-y-2">
              <Label htmlFor="insuranceCarrier" className="text-slate-300">
                Insurance Carrier
              </Label>
              <Input
                id="insuranceCarrier"
                value={formData.insuranceCarrier}
                onChange={(e) =>
                  setFormData({ ...formData, insuranceCarrier: e.target.value })
                }
                placeholder="e.g., State Farm, Allstate, USAA"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Policy Number */}
            <div className="space-y-2">
              <Label htmlFor="policyNumber" className="text-slate-300">
                Policy Number
              </Label>
              <Input
                id="policyNumber"
                value={formData.policyNumber}
                onChange={(e) =>
                  setFormData({ ...formData, policyNumber: e.target.value })
                }
                placeholder="Policy #"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Claim Number */}
            <div className="space-y-2">
              <Label htmlFor="claimNumber" className="text-slate-300">
                Claim Number
              </Label>
              <Input
                id="claimNumber"
                value={formData.claimNumber}
                onChange={(e) =>
                  setFormData({ ...formData, claimNumber: e.target.value })
                }
                placeholder="Claim #"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Deductible */}
            <div className="space-y-2">
              <Label htmlFor="deductible" className="text-slate-300">
                Deductible Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <Input
                  id="deductible"
                  type="number"
                  step="0.01"
                  value={formData.deductible}
                  onChange={(e) =>
                    setFormData({ ...formData, deductible: e.target.value })
                  }
                  placeholder="0.00"
                  className="bg-slate-700 border-slate-600 text-white pl-7"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Display Mode */}
            <div>
              <p className="text-sm text-slate-400 mb-1">Insurance Carrier</p>
              <p className="text-white font-medium">
                {insuranceCarrier || <span className="text-slate-500">Not set</span>}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-1">Policy Number</p>
              <p className="text-white font-medium">
                {policyNumber || <span className="text-slate-500">Not set</span>}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-1">Claim Number</p>
              <p className="text-white font-medium">
                {claimNumber || <span className="text-slate-500">Not set</span>}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-1">Deductible</p>
              <p className="text-white font-medium">
                {deductible ? (
                  `$${parseFloat(deductible).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                ) : (
                  <span className="text-slate-500">Not set</span>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
