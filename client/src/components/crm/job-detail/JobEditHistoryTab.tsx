import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, User, Clock, Eye, Trash2 } from "lucide-react";

interface EditHistory {
  id: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  editType: string;
  createdAt: Date | string;
  userId: number;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

interface JobEditHistoryTabProps {
  editHistory: EditHistory[];
  canDelete: boolean;
  onDeleteEntry: (id: number) => void;
  fieldTypeConfig: Record<string, { icon: any; color: string; label: string }>;
  editTypeColors: Record<string, string>;
}

export function JobEditHistoryTab({
  editHistory,
  canDelete,
  onDeleteEntry,
  fieldTypeConfig,
  editTypeColors,
}: JobEditHistoryTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Edit History ({editHistory.length})
        </h2>
        <span className="text-sm text-slate-400">Audit trail for compliance and accountability</span>
      </div>

      {editHistory.length > 0 ? (
        <div className="space-y-3">
          {editHistory.map((edit) => {
            const fieldConfig = fieldTypeConfig[edit.fieldName] || { icon: AlertCircle, color: "text-slate-400", label: edit.fieldName };
            const FieldIcon = fieldConfig.icon;
            
            return (
              <Card key={edit.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {/* Icon with color coding */}
                    <div className="w-10 h-10 rounded-full bg-slate-700/50 border-2 border-slate-600 flex items-center justify-center flex-shrink-0">
                      <FieldIcon className={`w-5 h-5 ${fieldConfig.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{fieldConfig.label}</span>
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${editTypeColors[edit.editType] || "bg-gray-500"}`}>
                            {edit.editType.replace("_", " ")}
                          </span>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this history entry? This cannot be undone.")) {
                                onDeleteEntry(edit.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {/* Show different layouts based on field type */}
                      {(edit.fieldName === "note" || edit.fieldName === "customer_message" || edit.fieldName === "document" || edit.fieldName === "photo") ? (
                        <div className="text-sm">
                          <p className="text-slate-300 bg-slate-700/30 px-3 py-2 rounded border border-slate-600/50">
                            {edit.newValue}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 mb-1 text-xs font-medium">Previous Value</p>
                            <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded font-mono text-xs border border-slate-600/30">
                              {edit.oldValue || "(empty)"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1 text-xs font-medium">New Value</p>
                            <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded font-mono text-xs border border-slate-600/30">
                              {edit.newValue || "(empty)"}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="text-slate-400 font-medium">{edit.userId === 0 ? "Customer" : (edit.user?.name || edit.user?.email || "Unknown")}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(edit.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <Eye className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">No edit history recorded yet</p>
            <p className="text-sm text-slate-500 mt-1">Changes to this job will be tracked here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
