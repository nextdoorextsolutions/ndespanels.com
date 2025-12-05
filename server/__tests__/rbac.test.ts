import { describe, it, expect } from "vitest";

// Test Role-Based Access Control logic and data structures

describe("Role-Based Access Control", () => {
  const ROLES = ["owner", "admin", "team_lead", "sales_rep", "office", "project_manager", "user"];
  
  describe("Role Definitions", () => {
    it("should have all required roles defined", () => {
      expect(ROLES).toContain("owner");
      expect(ROLES).toContain("admin");
      expect(ROLES).toContain("team_lead");
      expect(ROLES).toContain("sales_rep");
    });

    it("should have correct role hierarchy", () => {
      const roleHierarchy = {
        owner: 4,
        admin: 3,
        team_lead: 2,
        sales_rep: 1,
        office: 3,
        project_manager: 1,
        user: 0,
      };
      
      expect(roleHierarchy.owner).toBeGreaterThan(roleHierarchy.admin);
      expect(roleHierarchy.admin).toBeGreaterThan(roleHierarchy.team_lead);
      expect(roleHierarchy.team_lead).toBeGreaterThan(roleHierarchy.sales_rep);
    });
  });

  describe("Permission Helpers", () => {
    const getPermissions = (role: string) => {
      const permissions = {
        canViewAll: ["owner", "admin", "office"].includes(role),
        canViewTeam: role === "team_lead",
        canViewOwn: ["sales_rep", "project_manager"].includes(role),
        canEditAll: ["owner", "admin", "office"].includes(role),
        canDelete: role === "owner",
        canViewEditHistory: ["owner", "admin", "office"].includes(role),
        canManageTeam: role === "owner",
      };
      return permissions;
    };

    it("owner should have full permissions", () => {
      const perms = getPermissions("owner");
      expect(perms.canViewAll).toBe(true);
      expect(perms.canEditAll).toBe(true);
      expect(perms.canDelete).toBe(true);
      expect(perms.canViewEditHistory).toBe(true);
      expect(perms.canManageTeam).toBe(true);
    });

    it("admin should have view/edit all but no delete", () => {
      const perms = getPermissions("admin");
      expect(perms.canViewAll).toBe(true);
      expect(perms.canEditAll).toBe(true);
      expect(perms.canDelete).toBe(false);
      expect(perms.canViewEditHistory).toBe(true);
      expect(perms.canManageTeam).toBe(false);
    });

    it("team_lead should have team view permissions", () => {
      const perms = getPermissions("team_lead");
      expect(perms.canViewAll).toBe(false);
      expect(perms.canViewTeam).toBe(true);
      expect(perms.canDelete).toBe(false);
      expect(perms.canViewEditHistory).toBe(false);
    });

    it("sales_rep should only have own view permissions", () => {
      const perms = getPermissions("sales_rep");
      expect(perms.canViewAll).toBe(false);
      expect(perms.canViewTeam).toBe(false);
      expect(perms.canViewOwn).toBe(true);
      expect(perms.canDelete).toBe(false);
    });
  });

  describe("Role Display Names", () => {
    const getRoleDisplayName = (role: string) => {
      const displayNames: Record<string, string> = {
        owner: "Owner",
        admin: "Admin",
        team_lead: "Team Lead",
        sales_rep: "Sales Rep",
        office: "Office Staff",
        project_manager: "Project Manager",
        user: "User",
      };
      return displayNames[role] || role;
    };

    it("should return correct display names", () => {
      expect(getRoleDisplayName("owner")).toBe("Owner");
      expect(getRoleDisplayName("admin")).toBe("Admin");
      expect(getRoleDisplayName("team_lead")).toBe("Team Lead");
      expect(getRoleDisplayName("sales_rep")).toBe("Sales Rep");
    });
  });

  describe("Edit History Types", () => {
    const EDIT_TYPES = ["create", "update", "delete", "assign", "status_change"];
    
    it("should have all edit types defined", () => {
      expect(EDIT_TYPES).toContain("create");
      expect(EDIT_TYPES).toContain("update");
      expect(EDIT_TYPES).toContain("delete");
      expect(EDIT_TYPES).toContain("assign");
      expect(EDIT_TYPES).toContain("status_change");
    });

    it("should have correct edit type colors", () => {
      const editTypeColors: Record<string, string> = {
        create: "bg-green-500",
        update: "bg-blue-500",
        delete: "bg-red-500",
        assign: "bg-purple-500",
        status_change: "bg-yellow-500",
      };
      
      expect(editTypeColors.create).toBe("bg-green-500");
      expect(editTypeColors.delete).toBe("bg-red-500");
    });
  });

  describe("Job Access Control", () => {
    const canAccessJob = (
      userRole: string,
      userId: number,
      teamLeadId: number | null,
      jobAssignedTo: number | null
    ) => {
      // Owner and Admin can access all
      if (["owner", "admin", "office"].includes(userRole)) {
        return true;
      }
      
      // Team Lead can access their own and their team's jobs
      if (userRole === "team_lead") {
        return jobAssignedTo === userId || teamLeadId === userId;
      }
      
      // Sales Rep can only access their own assigned jobs
      if (["sales_rep", "project_manager"].includes(userRole)) {
        return jobAssignedTo === userId;
      }
      
      return false;
    };

    it("owner can access any job", () => {
      expect(canAccessJob("owner", 1, null, 5)).toBe(true);
      expect(canAccessJob("owner", 1, null, null)).toBe(true);
    });

    it("admin can access any job", () => {
      expect(canAccessJob("admin", 2, null, 5)).toBe(true);
    });

    it("team_lead can access their own jobs", () => {
      expect(canAccessJob("team_lead", 3, null, 3)).toBe(true);
    });

    it("team_lead can access team member jobs", () => {
      // Job assigned to user 5, who has team lead 3
      expect(canAccessJob("team_lead", 3, 3, 5)).toBe(true);
    });

    it("team_lead cannot access other team jobs", () => {
      // Job assigned to user 5, who has team lead 4 (not 3)
      expect(canAccessJob("team_lead", 3, 4, 5)).toBe(false);
    });

    it("sales_rep can only access their own jobs", () => {
      expect(canAccessJob("sales_rep", 5, 3, 5)).toBe(true);
      expect(canAccessJob("sales_rep", 5, 3, 6)).toBe(false);
    });
  });

  describe("Job Edit Permissions", () => {
    const canEditJob = (
      userRole: string,
      userId: number,
      teamLeadId: number | null,
      jobAssignedTo: number | null
    ) => {
      // Owner and Admin can edit all
      if (["owner", "admin", "office"].includes(userRole)) {
        return true;
      }
      
      // Team Lead can edit their own and their team's jobs
      if (userRole === "team_lead") {
        return jobAssignedTo === userId || teamLeadId === userId;
      }
      
      // Sales Rep can only edit their own assigned jobs
      if (["sales_rep", "project_manager"].includes(userRole)) {
        return jobAssignedTo === userId;
      }
      
      return false;
    };

    it("owner can edit any job", () => {
      expect(canEditJob("owner", 1, null, 5)).toBe(true);
    });

    it("sales_rep can edit their assigned job", () => {
      expect(canEditJob("sales_rep", 5, 3, 5)).toBe(true);
    });

    it("sales_rep cannot edit unassigned job", () => {
      expect(canEditJob("sales_rep", 5, 3, 6)).toBe(false);
    });
  });

  describe("Job Delete Permissions", () => {
    const canDeleteJob = (userRole: string) => {
      return userRole === "owner";
    };

    it("only owner can delete jobs", () => {
      expect(canDeleteJob("owner")).toBe(true);
      expect(canDeleteJob("admin")).toBe(false);
      expect(canDeleteJob("team_lead")).toBe(false);
      expect(canDeleteJob("sales_rep")).toBe(false);
    });
  });

  describe("Edit History Visibility", () => {
    const canViewEditHistory = (userRole: string) => {
      return ["owner", "admin", "office"].includes(userRole);
    };

    it("owner can view edit history", () => {
      expect(canViewEditHistory("owner")).toBe(true);
    });

    it("admin can view edit history", () => {
      expect(canViewEditHistory("admin")).toBe(true);
    });

    it("team_lead cannot view edit history", () => {
      expect(canViewEditHistory("team_lead")).toBe(false);
    });

    it("sales_rep cannot view edit history", () => {
      expect(canViewEditHistory("sales_rep")).toBe(false);
    });
  });
});
