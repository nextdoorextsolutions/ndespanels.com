import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { User, Mail, Shield, Edit2, UserCheck, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", description: "Full access to all features", color: "bg-[#00d4aa]/20 text-[#00d4aa]" },
  { value: "admin", label: "Admin", description: "Full access except billing", color: "bg-purple-100 text-purple-700" },
  { value: "office", label: "Office Staff", description: "Lead management & reports", color: "bg-blue-100 text-blue-700" },
  { value: "sales_rep", label: "Sales Rep", description: "View & update assigned leads", color: "bg-green-100 text-green-700" },
  { value: "project_manager", label: "Project Manager", description: "Production & scheduling", color: "bg-orange-100 text-orange-700" },
  { value: "user", label: "User", description: "Basic access", color: "bg-gray-100 text-gray-700" },
];

export default function CRMTeam() {
  const { data: team, isLoading, refetch } = trpc.crm.getTeam.useQuery();
  const { data: currentUser } = trpc.auth.me.useQuery();
  const updateMember = trpc.crm.updateTeamMember.useMutation({
    onSuccess: () => {
      toast.success("Team member updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [editingMember, setEditingMember] = useState<any>(null);

  const getRoleColor = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.color || "bg-gray-100 text-gray-700";
  };

  const canEditRoles = currentUser?.role === "owner" || currentUser?.role === "admin";

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm text-gray-500">Manage team members and their roles</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="w-4 h-4" />
              {team?.length || 0} team members
            </span>
            <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </div>

        {/* Role Legend */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {ROLE_OPTIONS.map((role) => (
                <div key={role.value} className="text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${role.color}`}>
                    {role.label}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team?.map((member) => (
            <Card key={member.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold text-lg">
                      {member.name?.charAt(0) || member.email?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.name || "Unnamed User"}
                      </h3>
                      {canEditRoles && member.id !== currentUser?.id && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingMember(member)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white">
                            <DialogHeader>
                              <DialogTitle className="text-gray-900">Edit Team Member</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Name</p>
                                <p className="font-medium text-gray-900">{member.name || member.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 mb-2">Role</p>
                                <Select 
                                  defaultValue={member.role}
                                  onValueChange={(value) => {
                                    updateMember.mutate({ userId: member.id, role: value as "owner" | "admin" | "office" | "sales_rep" | "project_manager" | "user" });
                                  }}
                                >
                                  <SelectTrigger className="bg-white border-gray-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLE_OPTIONS.map((role) => (
                                      <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role}
                      </span>
                      {member.id === currentUser?.id && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!team || team.length === 0) && (
            <Card className="col-span-full shadow-sm">
              <CardContent className="py-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No team members yet</p>
                <p className="text-sm mt-1">Team members will appear here after they log in</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Access Info */}
        <Card className="mt-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#00d4aa]" />
              CRM Access Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                <strong>How to add team members:</strong> Share the CRM login link with your team. 
                Once they log in with their Manus account, they'll appear here and you can assign their role.
              </p>
              <p>
                <strong>Role assignment:</strong> Only Owners and Admins can change team member roles. 
                New users start with "User" role by default.
              </p>
              <div className="bg-[#00d4aa]/10 p-4 rounded-lg border border-[#00d4aa]/20">
                <p className="font-medium text-[#00d4aa]">CRM Access URL:</p>
                <code className="text-gray-700">{window.location.origin}/crm</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
