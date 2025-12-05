import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { User, Mail, Shield, Edit2, UserCheck, Users, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", description: "Full access - view, edit, delete, history", color: "bg-purple-500/20 text-purple-400" },
  { value: "admin", label: "Admin", description: "View all, edit all, no delete", color: "bg-blue-500/20 text-blue-400" },
  { value: "team_lead", label: "Team Lead", description: "View own + team members' jobs", color: "bg-green-500/20 text-green-400" },
  { value: "sales_rep", label: "Sales Rep", description: "View & edit assigned jobs only", color: "bg-cyan-500/20 text-cyan-400" },
  { value: "office", label: "Office Staff", description: "Same as Admin", color: "bg-blue-500/20 text-blue-400" },
  { value: "project_manager", label: "Project Manager", description: "Same as Sales Rep", color: "bg-orange-500/20 text-orange-400" },
  { value: "user", label: "User", description: "Basic access", color: "bg-slate-600/50 text-slate-300" },
];

export default function CRMTeam() {
  const { data: team, isLoading, refetch } = trpc.crm.getTeam.useQuery();
  const { data: teamLeads } = trpc.crm.getTeamLeads.useQuery();
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: permissions } = trpc.crm.getMyPermissions.useQuery();
  
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
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedTeamLead, setSelectedTeamLead] = useState<string>("");

  const getRoleColor = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.color || "bg-slate-600/50 text-slate-300";
  };

  const canEditRoles = permissions?.canManageTeam ?? false;

  const handleSaveChanges = () => {
    if (!editingMember) return;
    
    updateMember.mutate({
      userId: editingMember.id,
      role: selectedRole as any,
      teamLeadId: selectedTeamLead === "none" ? null : selectedTeamLead ? parseInt(selectedTeamLead) : undefined,
    });
    setEditingMember(null);
  };

  const openEditDialog = (member: any) => {
    setEditingMember(member);
    setSelectedRole(member.role);
    setSelectedTeamLead(member.teamLeadId?.toString() || "none");
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

  // Group team members by role
  const owners = team?.filter(m => m.role === "owner") || [];
  const admins = team?.filter(m => m.role === "admin" || m.role === "office") || [];
  const teamLeadsList = team?.filter(m => m.role === "team_lead") || [];
  const salesReps = team?.filter(m => m.role === "sales_rep" || m.role === "project_manager") || [];
  const users = team?.filter(m => m.role === "user") || [];

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Management</h1>
            <p className="text-sm text-slate-400">Manage team members, roles, and team assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 flex items-center gap-1">
              <Users className="w-4 h-4" />
              {team?.length || 0} team members
            </span>
            <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </div>

        {/* Role Hierarchy */}
        <Card className="mb-6 shadow-sm bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Role Hierarchy & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                  Owner
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                  Admin
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                  Team Lead
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                Sales Rep
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-400">
              <div className="text-center">
                <p className="font-medium text-purple-400">Owner</p>
                <p>View, Edit, Delete all</p>
                <p>View edit history</p>
                <p>Manage team</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-blue-400">Admin</p>
                <p>View, Edit all</p>
                <p>View edit history</p>
                <p>Cannot delete</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-green-400">Team Lead</p>
                <p>View own + team's jobs</p>
                <p>Edit own + team's jobs</p>
                <p>Cannot delete</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-cyan-400">Sales Rep</p>
                <p>View assigned only</p>
                <p>Edit assigned only</p>
                <p>Cannot delete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members by Role */}
        <div className="space-y-6">
          {/* Owners */}
          {owners.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                Owners ({owners.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {owners.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    canEditRoles={canEditRoles}
                    getRoleColor={getRoleColor}
                    onEdit={openEditDialog}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Admins */}
          {admins.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Admins ({admins.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    canEditRoles={canEditRoles}
                    getRoleColor={getRoleColor}
                    onEdit={openEditDialog}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Leads */}
          {teamLeadsList.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Team Leads ({teamLeadsList.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamLeadsList.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    canEditRoles={canEditRoles}
                    getRoleColor={getRoleColor}
                    onEdit={openEditDialog}
                    showTeamCount
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sales Reps */}
          {salesReps.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
                Sales Reps ({salesReps.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {salesReps.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    canEditRoles={canEditRoles}
                    getRoleColor={getRoleColor}
                    onEdit={openEditDialog}
                    showTeamLead
                  />
                ))}
              </div>
            </div>
          )}

          {/* Basic Users */}
          {users.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-500" />
                Users ({users.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    canEditRoles={canEditRoles}
                    getRoleColor={getRoleColor}
                    onEdit={openEditDialog}
                  />
                ))}
              </div>
            </div>
          )}

          {(!team || team.length === 0) && (
            <Card className="shadow-sm bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No team members yet</p>
                <p className="text-sm mt-1">Team members will appear here after they log in</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Member Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Team Member</DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4 pt-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Name</p>
                  <p className="font-medium text-white">{editingMember.name || editingMember.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2">Role</p>
                  <Select 
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="text-white hover:bg-slate-600">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${role.color.split(" ")[0].replace("/20", "")}`} />
                            {role.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {ROLE_OPTIONS.find(r => r.value === selectedRole)?.description}
                  </p>
                </div>
                
                {/* Team Lead Assignment (for Sales Reps) */}
                {(selectedRole === "sales_rep" || selectedRole === "project_manager") && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Assign to Team Lead</p>
                    <Select 
                      value={selectedTeamLead}
                      onValueChange={setSelectedTeamLead}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select team lead" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="none" className="text-white hover:bg-slate-600">
                          No Team Lead
                        </SelectItem>
                        {teamLeads?.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()} className="text-white hover:bg-slate-600">
                            {lead.name || lead.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      Team leads can view and edit jobs assigned to their team members
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setEditingMember(null)}
                    className="text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveChanges}
                    disabled={updateMember.isPending}
                    className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Access Info */}
        <Card className="mt-6 shadow-sm bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#00d4aa]" />
              CRM Access Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                <strong className="text-white">How to add team members:</strong> Share the CRM login link with your team. 
                Once they log in with their Manus account, they'll appear here and you can assign their role.
              </p>
              <p>
                <strong className="text-white">Role assignment:</strong> Only Owners can change team member roles and assign team leads.
              </p>
              <p>
                <strong className="text-white">Team Lead assignment:</strong> Assign Sales Reps to Team Leads so Team Leads can view and manage their team's jobs.
              </p>
              <div className="bg-[#00d4aa]/10 p-4 rounded-lg border border-[#00d4aa]/20">
                <p className="font-medium text-[#00d4aa]">CRM Access URL:</p>
                <code className="text-white">{window.location.origin}/crm</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}

// Team Member Card Component
function TeamMemberCard({ 
  member, 
  currentUser, 
  canEditRoles, 
  getRoleColor, 
  onEdit,
  showTeamCount = false,
  showTeamLead = false,
}: {
  member: any;
  currentUser: any;
  canEditRoles: boolean;
  getRoleColor: (role: string) => string;
  onEdit: (member: any) => void;
  showTeamCount?: boolean;
  showTeamLead?: boolean;
}) {
  const ROLE_OPTIONS = [
    { value: "owner", label: "Owner" },
    { value: "admin", label: "Admin" },
    { value: "team_lead", label: "Team Lead" },
    { value: "sales_rep", label: "Sales Rep" },
    { value: "office", label: "Office Staff" },
    { value: "project_manager", label: "Project Manager" },
    { value: "user", label: "User" },
  ];

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow bg-slate-800 border-slate-700">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center flex-shrink-0">
            <span className="text-black font-bold text-lg">
              {member.name?.charAt(0) || member.email?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white truncate">
                {member.name || "Unnamed User"}
              </h3>
              {canEditRoles && member.id !== currentUser?.id && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => onEdit(member)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
              <Mail className="w-3 h-3" />
              {member.email}
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                {member.roleDisplayName || ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role}
              </span>
              {member.id === currentUser?.id && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-600/50 text-slate-300">
                  You
                </span>
              )}
            </div>
            {showTeamCount && member.teamMemberCount > 0 && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {member.teamMemberCount} team member{member.teamMemberCount !== 1 ? "s" : ""}
              </p>
            )}
            {showTeamLead && member.teamLeadName && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Reports to: {member.teamLeadName}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
