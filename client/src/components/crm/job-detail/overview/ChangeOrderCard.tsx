import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Edit2, Check, X, DollarSign, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ChangeOrderItem {
  id: string;
  description: string;
  amount: string;
}

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
  const [changeOrders, setChangeOrders] = useState<ChangeOrderItem[]>(() => {
    // Parse existing data if available
    if (supplementNumbers) {
      try {
        const parsed = JSON.parse(supplementNumbers);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // If not JSON, treat as legacy single item
        return [{ id: '1', description: supplementNumbers, amount: extrasCharged?.toString() || '0' }];
      }
    }
    return extrasCharged ? [{ id: '1', description: 'Change Order', amount: extrasCharged.toString() }] : [];
  });
  
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
    // Validate all amounts
    for (const item of changeOrders) {
      const amount = parseFloat(item.amount);
      if (isNaN(amount)) {
        toast.error(`Invalid amount for ${item.description}`);
        return;
      }
    }
    
    // Calculate total
    const totalExtras = changeOrders.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    // Store as JSON
    const supplementData = changeOrders.length > 0 ? JSON.stringify(changeOrders) : null;
    
    updateLead.mutate({ 
      id: jobId, 
      extrasCharged: totalExtras,
      supplementNumbers: supplementData
    });
  };

  const handleCancel = () => {
    // Reset to original data
    if (supplementNumbers) {
      try {
        const parsed = JSON.parse(supplementNumbers);
        if (Array.isArray(parsed)) {
          setChangeOrders(parsed);
        } else {
          setChangeOrders(extrasCharged ? [{ id: '1', description: supplementNumbers, amount: extrasCharged.toString() }] : []);
        }
      } catch {
        setChangeOrders(extrasCharged ? [{ id: '1', description: supplementNumbers, amount: extrasCharged.toString() }] : []);
      }
    } else {
      setChangeOrders(extrasCharged ? [{ id: '1', description: 'Change Order', amount: extrasCharged.toString() }] : []);
    }
    setIsEditing(false);
  };

  const addChangeOrder = () => {
    setChangeOrders([...changeOrders, { id: Date.now().toString(), description: '', amount: '0' }]);
  };

  const removeChangeOrder = (id: string) => {
    setChangeOrders(changeOrders.filter(item => item.id !== id));
  };

  const updateChangeOrder = (id: string, field: 'description' | 'amount', value: string) => {
    setChangeOrders(changeOrders.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Ensure numeric addition by parsing to numbers
  const approvedAmountNum = typeof approvedAmount === 'number' ? approvedAmount : parseFloat(String(approvedAmount || 0));
  const extrasChargedNum = typeof extrasCharged === 'number' ? extrasCharged : parseFloat(String(extrasCharged || 0));
  const totalAmount = approvedAmountNum + extrasChargedNum;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">Change Order Items</label>
              <Button
                size="sm"
                variant="outline"
                onClick={addChangeOrder}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {changeOrders.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    value={item.description}
                    onChange={(e) => updateChangeOrder(item.id, 'description', e.target.value)}
                    placeholder="Description (e.g., Wood, Tarps, Supplement)"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateChangeOrder(item.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="pl-8 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                {changeOrders.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeChangeOrder(item.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {changeOrders.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                No change orders yet. Click "Add Item" to create one.
              </div>
            )}
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
              <div className="text-sm text-slate-400">Change Order Items</div>
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
            
            {changeOrders.length > 0 ? (
              <div className="space-y-2">
                {changeOrders.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm bg-slate-700/50 p-2 rounded border border-slate-600">
                    <span className="text-white">{item.description || 'Change Order'}</span>
                    <span className="text-orange-400 font-semibold">${formatCurrency(parseFloat(item.amount))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 text-center py-2">
                No change orders
              </div>
            )}

            {(approvedAmount || extrasCharged) && (
              <div className="pt-3 border-t border-slate-700">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-white flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Total Amount
                  </span>
                  <span className="text-green-400 text-lg">${formatCurrency(totalAmount)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Approved: ${formatCurrency(approvedAmountNum)} + Extras: ${formatCurrency(extrasChargedNum)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
