# Jobs Router Refactoring - COMPLETION GUIDE

## What Was Done

### ✅ Created Sub-Routers (800 lines extracted)

1. **`server/api/routers/jobs/shared.ts`**
   - Common imports and utilities
   - Email validation helper

2. **`server/api/routers/jobs/analytics.ts`** (~400 lines)
   - `getStats` - Dashboard statistics
   - `getPipeline` - Pipeline data
   - `getReportStats` - Report summary
   - `getMonthlyTrends` - Monthly trends
   - `getLeadsByCategory` - Category filtering
   - `getCategoryCounts` - Tab counts

3. **`server/api/routers/jobs/documents.ts`** (~300 lines)
   - `uploadPhoto` - Protected photo upload
   - `getJobForUpload` - Public job info
   - `uploadFieldPhoto` - Public field upload
   - `searchJob` - Document search

4. **`server/api/routers/jobs/lien-rights.ts`** (~150 lines)
   - `getLienRightsJobs` - Lien tracking
   - `getLienRightsAlertSummary` - Dashboard widget
   - `sendLienRightsAlert` - Alert notifications

5. **`server/api/routers/jobs/index.ts`**
   - Exports all sub-routers

### ⚠️ Remaining Work

The original `jobs.ts` still has ~1,100 lines of core CRUD operations that need to stay:
- `getLeads`, `getLead`, `createJob`, `updateLead`
- `updateProduct`, `updateCustomerInfo`, `updateInsuranceInfo`
- `generateRoofReport`, `importEstimatorLeads`
- `toggleFollowUp`, `deleteLead`
- `getEditHistory`, `deleteEditHistory`
- `getAppointments`, `scheduleAppointment`
- `getLeadsForExport`, `getJobDetail`, `addMessage`
- `getAllUsers`, `getSolarBuildingData`

## How to Complete the Refactoring

### Option 1: Manual Merge (Recommended for Safety)

1. **Keep the current `jobs.ts` as-is**
2. **Add imports at the top:**
   ```typescript
   import { analyticsRouter } from "./jobs/analytics";
   import { documentsRouter } from "./jobs/documents";
   import { lienRightsRouter } from "./jobs/lien-rights";
   ```

3. **At the END of the jobsRouter definition, merge sub-routers:**
   ```typescript
   export const jobsRouter = router({
     // ... all existing endpoints stay here ...
     
     // Merge sub-routers (MUST be at the end)
     ...analyticsRouter._def.procedures,
     ...documentsRouter._def.procedures,
     ...lienRightsRouter._def.procedures,
   });
   ```

4. **Remove the extracted endpoints from jobs.ts:**
   - Delete `getStats` (lines 44-133)
   - Delete `getPipeline` (lines 994-1030)
   - Delete `getReportStats` (lines 1167-1215)
   - Delete `getMonthlyTrends` (lines 1220-1266)
   - Delete `getLeadsByCategory` (lines 1269-1293)
   - Delete `getCategoryCounts` (lines 1352-1407)
   - Delete `getLienRightsJobs` (lines 1296-1349)
   - Delete `getLienRightsAlertSummary` (lines 1788-1797)
   - Delete `sendLienRightsAlert` (lines 1800-1814)
   - Delete `uploadPhoto` (lines 1591-1662)
   - Delete `getJobForUpload` (lines 1667-1682)
   - Delete `uploadFieldPhoto` (lines 1685-1736)
   - Delete `searchJob` (lines 1740-1783)

### Option 2: Use Prepared File

I created `jobs-new.ts` with the core structure. You need to:
1. Copy remaining endpoints from `jobs.ts` to `jobs-new.ts`
2. Replace `jobs.ts` with `jobs-new.ts`

## Testing Checklist

After completing the refactoring:

```bash
# 1. Check TypeScript compilation
npm run build

# 2. Start the server
npm run dev

# 3. Test these endpoints:
# - Dashboard stats: trpc.crm.getStats()
# - Photo upload: trpc.crm.uploadPhoto()
# - Lien rights: trpc.crm.getLienRightsJobs()
# - Core CRUD: trpc.crm.getLead()
```

## Rollback if Needed

```bash
mv server/api/routers/jobs.ts.backup server/api/routers/jobs.ts
```

## Expected Results

- **Before:** 1,883 lines in jobs.ts
- **After:** ~1,100 lines in jobs.ts + 800 lines in sub-routers
- **Reduction:** 42% smaller main file
- **API:** No breaking changes (all endpoints work the same)

## Files Created

- ✅ `server/api/routers/jobs/shared.ts`
- ✅ `server/api/routers/jobs/analytics.ts`
- ✅ `server/api/routers/jobs/documents.ts`
- ✅ `server/api/routers/jobs/lien-rights.ts`
- ✅ `server/api/routers/jobs/index.ts`
- ✅ `server/api/routers/jobs-new.ts` (template)
- ✅ `server/api/routers/jobs.ts.backup` (safety backup)

## Next Steps

Choose Option 1 (manual merge) or Option 2 (use jobs-new.ts), then test and push to main.
