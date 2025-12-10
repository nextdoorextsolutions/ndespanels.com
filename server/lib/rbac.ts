import { User, ReportRequest } from "../../drizzle/schema";

/**
 * Role hierarchy and permissions for NextDoor CRM
 * 
 * Roles:
 * - owner: Full access - view, edit, delete everything, view edit history
 * - admin: View all jobs, edit everything, cannot delete (Office Staff)
 * - field_crew: View scope of work and upload photos only (Laborers)
 * - team_lead: View own jobs + jobs of team members assigned to them
 * - sales_rep: View and edit only their own assigned jobs, no delete
 */

export type CRMRole = "owner" | "admin" | "field_crew" | "team_lead" | "sales_rep" | "office" | "project_manager" | "user";

// Map legacy roles to new role system
export function normalizeRole(role: string): CRMRole {
  switch (role) {
    case "owner":
      return "owner";
    case "admin":
    case "office":
      return "admin"; // Office staff = Admin
    case "field_crew":
      return "field_crew";
    case "team_lead":
      return "team_lead";
    case "sales_rep":
    case "project_manager":
      return "sales_rep"; // Project managers treated as sales reps
    default:
      return "user";
  }
}

// Check if user has owner role
export function isOwner(user: User | null): boolean {
  if (!user) return false;
  return user.role === "owner";
}

// Check if user has admin role (includes owner)
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  return role === "owner" || role === "admin";
}

// Check if user has field crew role
export function isFieldCrew(user: User | null): boolean {
  if (!user) return false;
  return user.role === "field_crew";
}

// Check if user has team lead role
export function isTeamLead(user: User | null): boolean {
  if (!user) return false;
  return user.role === "team_lead";
}

// Check if user has sales rep role
export function isSalesRep(user: User | null): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  return role === "sales_rep";
}

/**
 * Permission checks
 */

// Can user view a specific job?
export function canViewJob(user: User | null, job: ReportRequest, teamMemberIds: number[] = []): boolean {
  if (!user) return false;
  
  const role = normalizeRole(user.role);
  
  // Owners and Admins can view everything
  if (role === "owner" || role === "admin") {
    return true;
  }
  
  // Field crew can view jobs they're assigned to (for scope of work)
  if (role === "field_crew") {
    return job.assignedTo === user.id;
  }
  
  // Team leads can view their own jobs + team members' jobs
  if (role === "team_lead") {
    // Their own job
    if (job.assignedTo === user.id) return true;
    // Team member's job
    if (job.assignedTo && teamMemberIds.includes(job.assignedTo)) return true;
    return false;
  }
  
  // Sales reps can only view their assigned jobs
  if (role === "sales_rep") {
    return job.assignedTo === user.id;
  }
  
  return false;
}

// Can user edit a specific job?
export function canEditJob(user: User | null, job: ReportRequest, teamMemberIds: number[] = []): boolean {
  if (!user) return false;
  
  const role = normalizeRole(user.role);
  
  // Owners and Admins can edit everything
  if (role === "owner" || role === "admin") {
    return true;
  }
  
  // Field crew cannot edit jobs - only view and upload photos
  if (role === "field_crew") {
    return false;
  }
  
  // Team leads can edit their own jobs + team members' jobs
  if (role === "team_lead") {
    if (job.assignedTo === user.id) return true;
    if (job.assignedTo && teamMemberIds.includes(job.assignedTo)) return true;
    return false;
  }
  
  // Sales reps can only edit their assigned jobs
  if (role === "sales_rep") {
    return job.assignedTo === user.id;
  }
  
  return false;
}

// Can user upload photos? (Field crew can do this)
export function canUploadPhotos(user: User | null, job: ReportRequest, teamMemberIds: number[] = []): boolean {
  if (!user) return false;
  
  const role = normalizeRole(user.role);
  
  // Owners and Admins can upload to any job
  if (role === "owner" || role === "admin") {
    return true;
  }
  
  // Field crew can upload photos to their assigned jobs
  if (role === "field_crew") {
    return job.assignedTo === user.id;
  }
  
  // Team leads can upload to their own jobs + team members' jobs
  if (role === "team_lead") {
    if (job.assignedTo === user.id) return true;
    if (job.assignedTo && teamMemberIds.includes(job.assignedTo)) return true;
    return false;
  }
  
  // Sales reps can upload to their assigned jobs
  if (role === "sales_rep") {
    return job.assignedTo === user.id;
  }
  
  return false;
}

// Can user delete a job? (Only owners)
export function canDeleteJob(user: User | null): boolean {
  if (!user) return false;
  return isOwner(user);
}

// Can user view edit history? (Only owners and admins)
export function canViewEditHistory(user: User | null): boolean {
  if (!user) return false;
  return isAdmin(user);
}

// Can user manage team members? (Only owners)
export function canManageTeam(user: User | null): boolean {
  if (!user) return false;
  return isOwner(user);
}

// Can user assign team members to team leads? (Only owners)
export function canAssignTeamMembers(user: User | null): boolean {
  if (!user) return false;
  return isOwner(user);
}

// Can user create new jobs?
export function canCreateJob(user: User | null): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  // Everyone except basic users and field crew can create jobs
  return role !== "user" && role !== "field_crew";
}

// Get role display name
export function getRoleDisplayName(role: string): string {
  switch (normalizeRole(role)) {
    case "owner":
      return "Owner";
    case "admin":
      return "Office Staff";
    case "field_crew":
      return "Field Crew";
    case "team_lead":
      return "Team Lead";
    case "sales_rep":
      return "Sales Rep";
    default:
      return "User";
  }
}

// Get role badge color
export function getRoleBadgeColor(role: string): string {
  switch (normalizeRole(role)) {
    case "owner":
      return "bg-purple-500";
    case "admin":
      return "bg-blue-500";
    case "field_crew":
      return "bg-orange-500";
    case "team_lead":
      return "bg-green-500";
    case "sales_rep":
      return "bg-cyan-500";
    default:
      return "bg-gray-500";
  }
}

// Helper to get team member IDs for a team lead
export async function getTeamMemberIds(db: any, teamLeadId: number): Promise<number[]> {
  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  const teamMembers = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.teamLeadId, teamLeadId));
  return teamMembers.map((m: any) => m.id);
}

// Helper to filter leads based on user role
export async function filterLeadsByRole(db: any, user: any, leads: any[]): Promise<any[]> {
  if (!user) return [];
  
  const role = normalizeRole(user.role || "user");
  
  // Owners and Admins see everything
  if (role === "owner" || role === "admin" || role === "office") {
    return leads;
  }
  
  // Team Leads see their own jobs + their team members' jobs
  if (role === "team_lead") {
    const teamMemberIds = await getTeamMemberIds(db, user.id);
    return leads.filter(lead => 
      lead.assignedTo === user.id || 
      (teamMemberIds.length > 0 && teamMemberIds.includes(lead.assignedTo))
    );
  }
  
  // Sales Reps only see their own jobs
  if (role === "sales_rep") {
    return leads.filter(lead => lead.assignedTo === user.id);
  }
  
  // Default: no access
  return [];
}
