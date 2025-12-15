import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Edit2, Check, X, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ChangeOrderCardProps {
  jobId: number;
  extrasCharged: number | null;
  supplementNumbers: string | null;
  approvedAmount: number | null;
  canEdit: boolean;
}

export function ChangeOrderCard({ 
  jobId, 
  extrasCharged, 
  supplementNumbers,
  approvedAmount,
  canEdit 
}: ChangeOrderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [extras, setExtras] = useState(extrasCharged?.toString() || "");
  const [supplements, setSupplements] = useState(supplementNumbers || "");
  
  const utils = trpc.useUtils();
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Change order updated");
      setIsEditing(false);
      utils.crm.getLead.invalidate({ id: jobId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    const numericExtras = extras ? parseFloat(extras) : null;
    if (extras && isNaN(numericExtras!)) {
      toast.error("Please enter a valid amount for extras");
      return;
    }
    updateLead.mutate({ 
      id: jobId, 
      extrasCharged: numericExtras,
      supplementNumbers: supplements || null
    });
  };

  const handleCancel = () => {
    setExtras(extrasCharged?.toString() || "");
    setSupplements(supplementNumbers || "");
    setIsEditing(false);
  };

  const totalAmount = (approvedAmount || 0) + (extrasCharged || 0);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Change Orders & Extras
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Additional Charges</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={extras}
                  onChange={(e) => setExtras(e.target.value)}
                  className="pl-8 bg-slate-700 border-slate-600 text-white"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Supplement Numbers</label>
              <Textarea
                value={supplements}
                onChange={(e) => setSupplements(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white resize-none"
                placeholder="Enter supplement numbers (e.g., SUP-001, SUP-002)"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateLead.isPending}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">Extras Charged</div>
                <div className="text-xl font-semibold text-orange-400">
                  {extrasCharged ? `$${extrasCharged.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                </div>
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
            
            {supplementNumbers && (
              <div>
                <div className="text-sm text-slate-400 mb-1">Supplement Numbers</div>
                <div className="text-sm text-white bg-slate-700/50 p-2 rounded border border-slate-600">
                  {supplementNumbers}
                </div>
              </div>
            )}

            {(approvedAmount || extrasCharged) && (
              <div className="pt-3 border-t border-slate-700">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-white flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Total Amount
                  </span>
                  <span className="text-green-400 text-lg">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Approved: ${(approvedAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Extras: ${(extrasCharged || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
