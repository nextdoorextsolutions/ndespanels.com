import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { User, Mail, Shield, Edit2, UserCheck, Users, Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", description: "Full access - view, edit, delete, history", color: "bg-purple-500/20 text-purple-400" },
  { value: "admin", label: "Office Staff", description: "View all, edit all, no delete", color: "bg-blue-500/20 text-blue-400" },
  { value: "field_crew", label: "Field Crew", description: "View scope of work, upload photos only", color: "bg-orange-500/20 text-orange-400" },
  { value: "team_lead", label: "Team Lead", description: "View own + team members' jobs", color: "bg-green-500/20 text-green-400" },
  { value: "sales_rep", label: "Sales Rep", description: "View & edit assigned jobs only", color: "bg-cyan-500/20 text-cyan-400" },
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

  const [isCreating, setIsCreating] = useState(false);

  const [editingMember, setEditingMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedTeamLead, setSelectedTeamLead] = useState<string>("");
  
  // Create account form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<string>("sales_rep");
  const [newAccountTeamLead, setNewAccountTeamLead] = useState<string>("none");
  const [createdAccount, setCreatedAccount] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCreateAccount = async () => {
    if (!newAccountName.trim() || !newAccountEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Get the current session token
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) {
        toast.error("Not authenticated");
        setIsCreating(false);
        return;
      }

      const response = await fetch('/api/team/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: newAccountName,
          email: newAccountEmail,
          role: newAccountRole,
          teamLeadId: newAccountTeamLead === "none" ? undefined : parseInt(newAccountTeamLead),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      toast.success("Account created successfully");
      setCreatedAccount(data);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewAccountName("");
    setNewAccountEmail("");
    setNewAccountRole("sales_rep");
    setNewAccountTeamLead("none");
    setCreatedAccount(null);
    setShowCreateDialog(false);
  };

  const copyCredentials = () => {
    if (!createdAccount) return;
    const loginUrl = createdAccount.loginUrl || `${window.location.origin}/crm`;
    const text = `CRM Account Created\n\nName: ${createdAccount.name}\nEmail: ${createdAccount.email}\nRole: ${ROLE_OPTIONS.find(r => r.value === createdAccount.role)?.label}\n\nLogin URL: ${loginUrl}\n\nPlease log in using your Manus account with the email above.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Credentials copied to clipboard");
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
  const fieldCrew = team?.filter(m => m.role === "field_crew") || [];
  const teamLeadsList = team?.filter(m => m.role === "team_lead") || [];
  const salesReps = team?.filter(m => m.role === "sales_rep" || m.role === "project_manager") || [];

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Management</h1>
            <p className="text-sm text-slate-400">Manage team members and their roles</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 flex items-center gap-1">
              <Users className="w-4 h-4" />
              {team?.length || 0} team members
            </span>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Team Member
                </Button>
              </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {createdAccount ? "Account Created" : "Create Team Account"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {createdAccount ? (
                    <div className="space-y-4 pt-4">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-400 font-medium mb-2">Account created successfully!</p>
                        <p className="text-sm text-slate-300">A notification has been sent with the login details. Share the following with the team member:</p>
                      </div>
                      
                      <div className="bg-slate-700 rounded-lg p-4 space-y-2">
                        <div>
                          <p className="text-xs text-slate-400">Name</p>
                          <p className="text-white font-medium">{createdAccount.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Email</p>
                          <p className="text-white font-medium">{createdAccount.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Role</p>
                          <p className="text-white font-medium">
                            {ROLE_OPTIONS.find(r => r.value === createdAccount.role)?.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Login URL</p>
                          <code className="text-[#00d4aa] text-sm">{createdAccount.loginUrl || `${window.location.origin}/crm`}</code>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={copyCredentials}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
                        >
                          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          {copied ? "Copied!" : "Copy Details"}
                        </Button>
                        <Button 
                          onClick={resetCreateForm}
                          className="flex-1 bg-[#00d4aa] hover:bg-[#00b894] text-black"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">Full Name *</label>
                        <Input
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          placeholder="John Smith"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">Email Address *</label>
                        <Input
                          type="email"
                          value={newAccountEmail}
                          onChange={(e) => setNewAccountEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          This email will be used to log in via Manus
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">Role *</label>
                        <Select value={newAccountRole} onValueChange={setNewAccountRole}>
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
                          {ROLE_OPTIONS.find(r => r.value === newAccountRole)?.description}
                        </p>
                      </div>
                      
                      {(newAccountRole === "sales_rep") && teamLeads && teamLeads.length > 0 && (
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Assign to Team Lead</label>
                          <Select value={newAccountTeamLead} onValueChange={setNewAccountTeamLead}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Select team lead" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="none" className="text-white hover:bg-slate-600">
                                No Team Lead
                              </SelectItem>
                              {teamLeads.map((lead) => (
                                <SelectItem key={lead.id} value={lead.id.toString()} className="text-white hover:bg-slate-600">
                                  {lead.name || lead.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button 
                          variant="ghost" 
                          onClick={() => setShowCreateDialog(false)}
                          className="text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateAccount}
                          disabled={isCreating || !newAccountName.trim() || !newAccountEmail.trim()}
                          className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                        >
                          {isCreating ? "Creating..." : "Create Account"}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
            </Dialog>
          </div>
        </div>

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

          {/* Admins / Office Staff */}
          {admins.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Office Staff ({admins.length})
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

          {/* Field Crew */}
          {fieldCrew.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                Field Crew ({fieldCrew.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fieldCrew.map((member) => (
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

          {(!team || team.length === 0) && (
            <Card className="shadow-sm bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No team members yet</p>
                <p className="text-sm mt-1 mb-4">Add your first team member to get started</p>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Team Member
                </Button>
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
                
                {/* Team Lead Assignment (for Sales Reps and Field Crew) */}
                {(selectedRole === "sales_rep" || selectedRole === "field_crew") && (
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
