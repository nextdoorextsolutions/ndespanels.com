# Jobs Router Refactoring - Option A (Quick Win)

## Objective
Reduce `server/api/routers/jobs.ts` from 1,900 lines to ~1,100 lines by extracting self-contained modules.

## Extracted Modules

### 1. `jobs/analytics.ts` (~400 lines)
**Endpoints Moved:**
- `getStats` - Dashboard statistics
- `getPipeline` - Pipeline data
- `getReportStats` - Report summary
- `getMonthlyTrends` - Monthly trends chart data
- `getLeadsByCategory` - Category filtering
- `getCategoryCounts` - Tab counts

**Impact:** Critical for dashboard rebuild

### 2. `jobs/documents.ts` (~300 lines)
**Endpoints Moved:**
- `uploadPhoto` - Protected photo upload
- `getJobForUpload` - Public job info
- `uploadFieldPhoto` - Public field upload
- `searchJob` - Document/activity search

**Impact:** File management isolation

### 3. `jobs/lien-rights.ts` (~150 lines)
**Endpoints Moved:**
- `getLienRightsJobs` - Lien tracking with urgency
- `getLienRightsAlertSummary` - Dashboard widget
- `sendLienRightsAlert` - Alert notifications

**Impact:** Pre-lien/lien release logic isolation

## API Compatibility Strategy

**CRITICAL:** The frontend expects `trpc.crm.getStats()`, NOT `trpc.crm.analytics.getStats()`.

To maintain compatibility, we use **router merging**:

```typescript
// OLD (monolithic):
export const jobsRouter = router({
  getStats: ...,
  getLead: ...,
  uploadPhoto: ...,
});

// NEW (modular, but API-compatible):
import { analyticsRouter } from "./jobs/analytics";
import { documentsRouter } from "./jobs/documents";
import { lienRightsRouter } from "./jobs/lien-rights";

export const jobsRouter = router({
  // Core CRUD stays here
  getLead: ...,
  createJob: ...,
  updateLead: ...,
  
  // Merge sub-routers at root level (NOT nested)
  ...analyticsRouter._def.procedures,
  ...documentsRouter._def.procedures,
  ...lienRightsRouter._def.procedures,
});
```

This ensures `trpc.crm.getStats()` still works!

## Files Created
- ✅ `server/api/routers/jobs/shared.ts` - Common imports
- ✅ `server/api/routers/jobs/analytics.ts` - Stats & reports
- ✅ `server/api/routers/jobs/documents.ts` - File uploads
- ✅ `server/api/routers/jobs/lien-rights.ts` - Lien tracking
- ✅ `server/api/routers/jobs/index.ts` - Module exports

## Files Modified
- 🔄 `server/api/routers/jobs.ts` - Remove extracted code, merge routers

## Size Reduction
- **Before:** 1,883 lines
- **After:** ~1,100 lines (estimated)
- **Reduction:** ~42% (800 lines extracted)

## Testing Checklist
- [ ] Dashboard loads stats
- [ ] Photo upload works
- [ ] Lien rights alerts function
- [ ] No TypeScript errors
- [ ] API structure unchanged (critical!)

## Rollback Plan
Backup created: `server/api/routers/jobs.ts.backup`

If issues arise:
```bash
mv server/api/routers/jobs.ts.backup server/api/routers/jobs.ts
```
