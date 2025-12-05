import { trpc } from "@/lib/trpc";
import { User, Phone, MapPin, GripVertical, DollarSign } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import { Card } from "@/components/ui/card";

const PIPELINE_STAGES = [
  { key: "new_lead", label: "New Leads", color: "bg-orange-500", lightBg: "bg-orange-50" },
  { key: "contacted", label: "Contacted", color: "bg-yellow-500", lightBg: "bg-yellow-50" },
  { key: "appointment_set", label: "Scheduled", color: "bg-blue-500", lightBg: "bg-blue-50" },
  { key: "inspection_complete", label: "Inspected", color: "bg-purple-500", lightBg: "bg-purple-50" },
  { key: "report_sent", label: "Report Sent", color: "bg-teal-500", lightBg: "bg-teal-50" },
  { key: "closed_won", label: "Closed Won", color: "bg-green-500", lightBg: "bg-green-50" },
];

export default function CRMPipeline() {
  const { data: pipeline, isLoading, refetch } = trpc.crm.getPipeline.useQuery();
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Lead moved successfully");
      refetch();
    },
  });

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    e.dataTransfer.setData("leadId", leadId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    if (leadId) {
      updateLead.mutate({ id: leadId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  // Calculate totals
  const getTotalValue = (leads: any[]) => {
    return leads.reduce((sum, lead) => sum + (lead.amountPaid || 0), 0) / 100;
  };

  return (
    <CRMLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-sm text-gray-500">Drag and drop jobs between stages to update their status</p>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const leads = pipeline?.[stage.key as keyof typeof pipeline] || [];
            const totalValue = getTotalValue(leads as any[]);
            
            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-72"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                {/* Column Header */}
                <div className={`${stage.lightBg} rounded-t-lg p-3 border-t-4 ${stage.color.replace('bg-', 'border-')}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                    <span className={`${stage.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                      {(leads as any[]).length}
                    </span>
                  </div>
                  {totalValue > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                      <DollarSign className="w-3 h-3" />
                      {totalValue.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Cards Container */}
                <div className="bg-gray-100 rounded-b-lg p-2 min-h-[500px] space-y-2">
                  {(leads as any[]).map((lead: any) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="p-3 bg-white cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border border-gray-200"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center flex-shrink-0">
                              <span className="text-black font-semibold text-xs">
                                {lead.fullName?.charAt(0) || "?"}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900 truncate">{lead.fullName}</p>
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{lead.address}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{lead.phone}</span>
                            </div>
                          </div>

                          {lead.salesRepCode && (
                            <div className="mt-2">
                              <span className="inline-block px-2 py-0.5 bg-[#00d4aa]/10 text-[#00d4aa] text-xs rounded font-medium">
                                Rep: {lead.salesRepCode}
                              </span>
                            </div>
                          )}

                          {lead.amountPaid > 0 && (
                            <div className="mt-2 text-xs font-medium text-green-600">
                              ${(lead.amountPaid / 100).toFixed(2)} paid
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  {(leads as any[]).length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Drop jobs here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CRMLayout>
  );
}
