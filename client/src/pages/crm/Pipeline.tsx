import { trpc } from "@/lib/trpc";
import { User, Phone, MapPin, GripVertical, DollarSign, AlertTriangle, Clock, Shield, Banknote, CreditCard, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Link } from "wouter";

type PipelineStatus = "lead" | "appointment_set" | "prospect" | "approved" | "project_scheduled" | "completed" | "invoiced" | "lien_legal" | "closed_deal" | "closed_lost";

const PIPELINE_STAGES: { key: PipelineStatus; label: string; color: string; borderColor: string; description: string }[] = [
  { key: "lead", label: "Lead", color: "bg-orange-500", borderColor: "border-orange-500", description: "New incoming leads" },
  { key: "appointment_set", label: "Appointment Set", color: "bg-yellow-500", borderColor: "border-yellow-500", description: "Inspection scheduled" },
  { key: "prospect", label: "Prospect", color: "bg-blue-500", borderColor: "border-blue-500", description: "Qualified prospects" },
  { key: "approved", label: "Approved", color: "bg-purple-500", borderColor: "border-purple-500", description: "Deal approved" },
  { key: "project_scheduled", label: "Project Scheduled", color: "bg-indigo-500", borderColor: "border-indigo-500", description: "Work scheduled" },
  { key: "completed", label: "Completed", color: "bg-teal-500", borderColor: "border-teal-500", description: "Project finished" },
  { key: "invoiced", label: "Invoiced", color: "bg-cyan-500", borderColor: "border-cyan-500", description: "Invoice sent" },
  { key: "lien_legal", label: "Lien Legal", color: "bg-red-500", borderColor: "border-red-500", description: "Legal action" },
  { key: "closed_deal", label: "Closed Deal", color: "bg-green-500", borderColor: "border-green-500", description: "Payment received" },
];

const DEAL_TYPES = [
  { key: "insurance", label: "Insurance", icon: Shield, color: "text-blue-400" },
  { key: "cash", label: "Cash", icon: Banknote, color: "text-green-400" },
  { key: "financed", label: "Financed", icon: CreditCard, color: "text-purple-400" },
];

export default function CRMPipeline() {
  const [expandedApproved, setExpandedApproved] = useState(true);
  const [selectedDealType, setSelectedDealType] = useState<string | null>(null);
  
  const { data: pipeline, isLoading, refetch } = trpc.crm.getPipeline.useQuery();
  const { data: lienRightsJobs } = trpc.crm.getLienRightsJobs.useQuery();
  const { data: categoryCounts } = trpc.crm.getCategoryCounts.useQuery();
  
  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Job moved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
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

  const handleDrop = (e: React.DragEvent, newStatus: PipelineStatus) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    if (leadId) {
      updateLead.mutate({ id: leadId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96 bg-slate-900">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  // Calculate totals
  const getTotalValue = (leads: any[]) => {
    return leads.reduce((sum, lead) => sum + (lead.amountPaid || 0), 0) / 100;
  };

  // Get leads for a stage, optionally filtered by deal type
  const getLeadsForStage = (stageKey: string) => {
    const leads = pipeline?.[stageKey as keyof typeof pipeline] || [];
    if (stageKey === "approved" && selectedDealType) {
      return (leads as any[]).filter((lead: any) => lead.dealType === selectedDealType);
    }
    return leads as any[];
  };

  // Get lien rights urgency indicator
  const getLienRightsIndicator = (lead: any) => {
    if (!lead.projectCompletedAt) return null;
    
    const lienJob = lienRightsJobs?.find((j: any) => j.id === lead.id);
    if (!lienJob) return null;
    
    const { daysRemaining, urgencyLevel } = lienJob;
    
    if (urgencyLevel === "critical") {
      return (
        <div className="flex items-center gap-1 mt-2 px-2 py-1 bg-red-500/20 rounded text-xs text-red-400 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-bold">{daysRemaining} days left!</span>
        </div>
      );
    } else if (urgencyLevel === "warning") {
      return (
        <div className="flex items-center gap-1 mt-2 px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-400">
          <Clock className="w-3 h-3" />
          <span>{daysRemaining} days remaining</span>
        </div>
      );
    } else if (urgencyLevel === "expired") {
      return (
        <div className="flex items-center gap-1 mt-2 px-2 py-1 bg-red-600/30 rounded text-xs text-red-300">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-bold">LIEN RIGHTS EXPIRED</span>
        </div>
      );
    }
    return null;
  };

  // Render a job card
  const renderJobCard = (lead: any, stageKey: string) => (
    <Card
      key={lead.id}
      draggable
      onDragStart={(e) => handleDragStart(e, lead.id)}
      className="p-3 bg-slate-700 cursor-grab active:cursor-grabbing hover:bg-slate-600 transition-colors border border-slate-600"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Link href={`/crm/job/${lead.id}`}>
            <div className="flex items-center gap-2 mb-1 hover:opacity-80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center flex-shrink-0">
                <span className="text-black font-semibold text-xs">
                  {lead.fullName?.charAt(0) || "?"}
                </span>
              </div>
              <p className="font-medium text-white truncate">{lead.fullName}</p>
            </div>
          </Link>
          
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{lead.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{lead.phone}</span>
            </div>
          </div>

          {/* Deal Type Badge */}
          {lead.dealType && (
            <div className="mt-2">
              {DEAL_TYPES.filter(dt => dt.key === lead.dealType).map(dt => (
                <span key={dt.key} className={`inline-flex items-center gap-1 px-2 py-0.5 bg-slate-600 text-xs rounded font-medium ${dt.color}`}>
                  <dt.icon className="w-3 h-3" />
                  {dt.label}
                </span>
              ))}
            </div>
          )}

          {lead.salesRepCode && (
            <div className="mt-2">
              <span className="inline-block px-2 py-0.5 bg-[#00d4aa]/20 text-[#00d4aa] text-xs rounded font-medium">
                Rep: {lead.salesRepCode}
              </span>
            </div>
          )}

          {lead.amountPaid > 0 && (
            <div className="mt-2 text-xs font-medium text-green-400">
              ${(lead.amountPaid / 100).toFixed(2)} paid
            </div>
          )}

          {/* Lien Rights Indicator for completed/invoiced jobs */}
          {(stageKey === "completed" || stageKey === "invoiced") && getLienRightsIndicator(lead)}
        </div>
      </div>
    </Card>
  );

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Sales Pipeline</h1>
          <p className="text-sm text-slate-400">Drag and drop jobs between stages to update their status</p>
        </div>

        {/* Lien Rights Alert Banner */}
        {lienRightsJobs && lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical" || j.urgencyLevel === "warning").length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-900/50 to-orange-900/50 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="font-semibold text-white">Lien Rights Attention Required</h3>
                <p className="text-sm text-slate-300">
                  {lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length} critical, {" "}
                  {lienRightsJobs.filter((j: any) => j.urgencyLevel === "warning").length} warning - 
                  Invoice before 90-day deadline to preserve lien rights
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const leads = getLeadsForStage(stage.key);
            const totalValue = getTotalValue(leads);
            const isApproved = stage.key === "approved";
            
            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-72"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                {/* Column Header */}
                <div className={`bg-slate-800 rounded-t-lg p-3 border-t-4 ${stage.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isApproved && (
                        <button 
                          onClick={() => setExpandedApproved(!expandedApproved)}
                          className="text-slate-400 hover:text-white"
                        >
                          {expandedApproved ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      <h3 className="font-semibold text-white">{stage.label}</h3>
                    </div>
                    <span className={`${stage.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                      {leads.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{stage.description}</p>
                  {totalValue > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-slate-400">
                      <DollarSign className="w-3 h-3" />
                      {totalValue.toFixed(2)}
                    </div>
                  )}
                  
                  {/* Deal Type Filter for Approved stage */}
                  {isApproved && expandedApproved && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <button
                        onClick={() => setSelectedDealType(null)}
                        className={`px-2 py-1 text-xs rounded ${!selectedDealType ? 'bg-[#00d4aa] text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >
                        All ({(categoryCounts?.insurance || 0) + (categoryCounts?.cash || 0) + (categoryCounts?.financed || 0)})
                      </button>
                      {DEAL_TYPES.map(dt => (
                        <button
                          key={dt.key}
                          onClick={() => setSelectedDealType(selectedDealType === dt.key ? null : dt.key)}
                          className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${selectedDealType === dt.key ? 'bg-[#00d4aa] text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                          <dt.icon className="w-3 h-3" />
                          {dt.label} ({categoryCounts?.[dt.key as keyof typeof categoryCounts] || 0})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cards Container */}
                <div className="bg-slate-800/50 rounded-b-lg p-2 min-h-[500px] space-y-2 border border-t-0 border-slate-700">
                  {leads.map((lead: any) => renderJobCard(lead, stage.key))}

                  {leads.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Drop jobs here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lien Rights Summary Section */}
        {lienRightsJobs && lienRightsJobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00d4aa]" />
              Lien Rights Tracking (90-Day Window)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Active */}
              <div className="bg-slate-800 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-semibold">Active (60+ days)</span>
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {lienRightsJobs.filter((j: any) => j.urgencyLevel === "active").length}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Safe window - plenty of time</p>
              </div>
              
              {/* Warning */}
              <div className="bg-slate-800 rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 font-semibold">Warning (15-30 days)</span>
                  <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {lienRightsJobs.filter((j: any) => j.urgencyLevel === "warning").length}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Action needed soon</p>
              </div>
              
              {/* Critical */}
              <div className="bg-slate-800 rounded-lg p-4 border border-red-500/30 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-400 font-semibold">Critical (&lt;14 days)</span>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {lienRightsJobs.filter((j: any) => j.urgencyLevel === "critical").length}
                  </span>
                </div>
                <p className="text-xs text-slate-400">URGENT - Invoice immediately!</p>
              </div>
              
              {/* Expired */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 font-semibold">Expired</span>
                  <span className="bg-slate-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {lienRightsJobs.filter((j: any) => j.urgencyLevel === "expired").length}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Lien rights lost</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
