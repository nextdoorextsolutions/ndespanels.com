# Router Organization

This directory contains the refactored tRPC routers for the CRM application. Each router handles a specific domain of functionality.

## 📁 Completed Routers

### Authentication & Users
- **`auth.ts`** - Authentication (login, logout, password reset, Supabase sync)
  - `loginWithPassword` - Traditional email/password login
  - `syncSupabaseUser` - Sync Supabase auth with CRM database
  - `logout` - Clear session
  - First user becomes owner automatically

- **`users.ts`** - User management and team operations
  - `getTeam` - Get all team members
  - `updateTeamMember` - Update user roles and permissions
  - `getMyPermissions` - Get current user's permissions
  - `getAssignedLeads` - Get leads assigned to user
  - Supports roles: owner, admin, office, sales_rep, project_manager, team_lead, field_crew

### CRM Core
- **`jobs.ts`** (mapped as `crm` for frontend compatibility)
  - **Dashboard & Analytics** - getStats, getMonthlyTrends, getReportStats
  - **Lead Management** - getLeads, getLead, createJob, updateLead, deleteLead
  - **Customer Info** - updateCustomerInfo, updateInsuranceInfo
  - **Pipeline** - getPipeline, getLeadsByCategory, getCategoryCounts
  - **Scheduling** - getAppointments, scheduleAppointment
  - **Job Details** - getJobDetail, addMessage, uploadPhoto
  - **Reports** - generateRoofReport, getLeadsForExport
  - **Lien Rights** - getLienRightsJobs, getLienRightsAlertSummary, sendLienRightsAlert
  - **Import** - importEstimatorLeads
  - **Edit History** - getEditHistory, deleteEditHistory
  - **Search** - searchJob, getAllUsers
  - 30+ procedures total

### Solar & Reports
- **`solar.ts`** - Google Solar API integration
  - `fetchSolarData` - Fetch building insights and solar potential
  - `updateJobWithSolarData` - Update job with solar API data
  - Handles fallback imagery when solar data unavailable

- **`report.ts`** - Roof report generation
  - `generateReport` - Create PDF roof reports
  - `getReportById` - Retrieve generated reports
  - Integrates with solar data and job information

### Proposals & Materials
- **`proposals.ts`** - Customer proposals and pricing
  - `createProposal` - Generate customer proposal
  - `updateProposal` - Modify existing proposal
  - `getProposalsByJob` - Get all proposals for a job
  - `deleteProposal` - Remove proposal

- **`materials.ts`** - Material orders and calculations
  - `calculateMaterialOrder` - Calculate materials needed
  - `createMaterialOrder` - Place material order
  - `getMaterialOrders` - Get orders by job
  - `generateBeaconCSV` - Export to Beacon format
  - `generateMaterialOrderPDF` - Create order PDF

### Activity & Documents
- **`activities.ts`** - Activity logs and notifications
  - `getActivities` - Get activity timeline
  - `addNote` - Add note to job
  - `getNotifications` - Get user notifications
  - `markNotificationRead` - Mark notification as read
  - `markAllNotificationsRead` - Clear all notifications

- **`documents.ts`** - File uploads and management
  - `uploadDocument` - Upload file to job
  - `getDocuments` - Get job documents
  - `deleteDocument` - Remove document
  - Integrates with Supabase Storage

## 🔄 Legacy Router

- **`../routers.ts`** - Main router assembly (reduced from 2,088 to 453 lines)
  - Imports all refactored routers
  - Contains Portal router (to be extracted)
  - Maps `jobs` router as `crm` for frontend compatibility

## 📋 Frontend Usage

Frontend code uses the routers via tRPC client:

```typescript
// Authentication
trpc.auth.loginWithPassword.useMutation()
trpc.auth.syncSupabaseUser.useMutation()

// Users & Team
trpc.users.getTeam.useQuery()
trpc.users.getMyPermissions.useQuery()

// CRM (Jobs Router)
trpc.crm.getStats.useQuery()
trpc.crm.getLeads.useQuery()
trpc.crm.createJob.useMutation()
trpc.crm.updateLead.useMutation()

// Solar
trpc.solar.fetchSolarData.useMutation()

// Reports
trpc.report.generateReport.useMutation()

// Proposals
trpc.proposals.createProposal.useMutation()

// Materials
trpc.materials.calculateMaterialOrder.useMutation()

// Activities
trpc.activities.getNotifications.useQuery()
trpc.activities.addNote.useMutation()

// Documents
trpc.documents.uploadDocument.useMutation()
```

## 🎯 Router Mapping

The main `appRouter` in `server/routers.ts` maps routers as follows:

```typescript
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  solar: solarRouter,
  report: reportRouter,
  proposals: proposalsRouter,
  materials: materialsRouter,
  users: usersRouter,
  activities: activitiesRouter,
  documents: documentsRouter,
  crm: jobsRouter, // ← jobs.ts mapped as 'crm' for backward compatibility
  portal: portalRouter, // ← Still in routers.ts, to be extracted
});
```

## 🔐 Permission Levels

Routers use these procedure types for access control:

- **`publicProcedure`** - No authentication required (portal, field upload)
- **`protectedProcedure`** - Requires authentication (most CRM operations)
- **`ownerOfficeProcedure`** - Owner/Office only (material orders, sensitive operations)

Additional RBAC checks within procedures:
- `canViewJob()` - Check if user can view specific job
- `canEditJob()` - Check if user can edit specific job
- `canDeleteJob()` - Owner only
- `canViewEditHistory()` - Owner/Admin only

## 📊 Role-Based Filtering

Jobs router implements role-based data filtering:

- **Owner/Admin** - See all jobs
- **Team Lead** - See own jobs + team members' jobs
- **Sales Rep** - See only assigned jobs
- **Field Crew** - Limited access via field upload

## 🚀 Next Steps

**Completed Extractions:**
- ✅ **portal.ts** - Customer portal extracted
- ✅ **jobs.ts** - Jobs/CRM router extracted
- ✅ Helper functions moved to `server/lib/`

**Type Safety:**
- ✅ Removed `@ts-nocheck` from 9 router files (users, auth, report, proposals, materials, documents, activities, routers, api/routers/index)
- [ ] Remove `@ts-nocheck` from 5 _core files (in progress)
- [ ] Add proper TypeScript interfaces for all inputs/outputs
- [ ] Replace `as any` casts with proper types

**Documentation:**
- [ ] Add JSDoc comments to all procedures
- [ ] Document input schemas
- [ ] Add usage examples

## 📝 Notes

- **Frontend Compatibility**: The `jobs` router is exposed as `crm` to maintain backward compatibility with existing frontend code
- **Edit History**: All job mutations automatically log changes to `editHistory` table
- **Permissions**: Most procedures check permissions before allowing operations
- **Error Handling**: All routers use TRPCError for consistent error responses
- **Validation**: All inputs validated with Zod schemas

## 🔗 Related Files

- `server/_core/trpc.ts` - tRPC setup and procedure definitions
- `server/lib/rbac.ts` - Role-based access control helpers
- `server/db.ts` - Database connection
- `drizzle/schema.ts` - Database schema definitions
- `client/src/lib/trpc.ts` - Frontend tRPC client setup
