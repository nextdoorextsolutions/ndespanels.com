# Project Roadmap

## 🚀 Finance & Dashboard Optimization (New Priority)

### Phase A: Finance & Data Sync ✅ COMPLETE
- [x] **Fix Finance Navigation:** Ensure "Home/Back" buttons route correctly to `/dashboard`.
- [x] **Sync Finance Jobs:** Update the Finance page to query the MAIN jobs database (`trpc.jobs.getAll`).
    - *Requirement:* Must show the same jobs as the main board but displayed with financial columns (Price, Margin, Material Cost).
    - *Requirement:* Pipeline stages must match the main 10-stage workflow exactly.
- [x] **Client Filter:** "Clients" page should ONLY show jobs in `Approved`, `Project Scheduled`, `Completed`, or `Invoiced` stages.

### Phase B: Permissions ✅ COMPLETE
- [x] **Office Staff Access:** RBAC already grants `office_staff` (admin role) full Read/Write access to all features.
    - *Note:* Finance/Invoices pages currently use mock data - backend integration needed separately.

### Phase C: Dashboard Quick Actions (Logic Implementation)
- [x] **"Needs Follow Up" Button:** ✅ COMPLETE
    - Create a "Request Follow Up" action inside Job Details.
    - Button click filters dashboard to these jobs.
    - Notify assigned sales rep when tagged.
    - *Implementation:* Added `needsFollowUp` field to schema, TRPC mutation, Job Details button, and dashboard action item.
- [x] **"Pending Inspection" Button:** ✅ ALREADY IMPLEMENTED
    - Dashboard shows `appointmentSetCount` for jobs in Appointment Set status.
    - Filter available via action item on dashboard.
- [x] **"Lien Rights" Button (Compliance):** ✅ ALREADY IMPLEMENTED
    - Query: `Status = Completed` AND tracks lien rights expiration.
    - Logic: Calculates days since completion (90-day window).
    - Visuals: Active (>60 days), Warning (60-75 days), Critical (<14 days).
    - Dashboard shows lien rights summary with color-coded alerts.
- [x] **"Overdue Tasks" Button:** ✅ SCHEMA CREATED
    - Created `Tasks` schema linked to `job_id` with Description, Assigned User, Due Date, Status.
    - *Next:* Add TRPC queries and UI for task management.
    - *Next:* Implement overdue logic and notifications.
