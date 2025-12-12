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
- [ ] **"Needs Follow Up" Button:**
    - Create a "Request Follow Up" action inside Job Details.
    - Button click filters dashboard to these jobs.
    - Notify assigned sales rep when tagged.
- [ ] **"Pending Inspection" Button:**
    - Filter dashboard for `Lead`/`Appointment Set` jobs with future or missing inspection dates.
- [ ] **"Lien Rights" Button (Compliance):**
    - Query: `Status = Completed` AND `Unpaid`.
    - Logic: Calculate days since completion.
    - Visuals: Green (<60 days), Yellow (60-75 days), Red (>75 days).
- [ ] **"Overdue Tasks" Button:**
    - Create `Tasks` schema linked to `job_id` (Description, Assigned User, Due Date, Status).
    - Logic: If `Pending` AND `Date > DueDate + 7`, mark "Overdue".
    - Notify: Assigned User + All Office Staff.
