import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Edit2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ContractPriceCardProps {
  jobId: number;
  totalPrice: number | null;
  canEdit: boolean;
}

export function ContractPriceCard({ jobId, totalPrice, canEdit }: ContractPriceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState(totalPrice?.toString() || "");
  
  const utils = trpc.useUtils();
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Contract price updated");
      setIsEditing(false);
      utils.crm.getLead.invalidate({ id: jobId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    updateLead.mutate({ id: jobId, totalPrice: numericPrice });
  };

  const handleCancel = () => {
    setPrice(totalPrice?.toString() || "");
    setIsEditing(false);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#00d4aa]" />
          Contract Price
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-8 bg-slate-700 border-slate-600 text-white"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateLead.isPending}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={updateLead.isPending}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-[#00d4aa]">
              {totalPrice ? `$${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Not set"}
            </div>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-2">
          Original contract amount (base price before changes)
        </p>
      </CardContent>
    </Card>
  );
}
