# Project TODO

- [x] Basic landing page with hero, features, pricing, form
- [x] Dark theme with cyan accents (Precision & Trust design)
- [x] Responsive navigation
- [x] FAQ section
- [x] Trust indicators (license, FAA compliant)
- [x] Upgrade to web-db-user for backend capabilities
- [x] Database schema for report requests
- [x] Stripe payment integration ($199 report)
- [x] Promo code "neighbor25" logic to waive fee
- [x] Email notification to owner on form submission
- [x] Update frontend form to handle payment flow
- [x] Test payment flow (promo code validation tests passing)
- [x] Integrate Twilio SMS notifications for new report requests (code ready, awaiting credentials)
- [x] Add roof concerns/notes text area to form
- [x] Add optional hands-on inspection checkbox to form
- [x] Update database schema for new fields
- [x] Update backend to handle new fields
- [x] Remove promo code hint from form
- [x] Add proper backlink to Nextdoorextroofing.com in footer
- [x] Make checkboxes more visible against dark background
- [x] Create Thank You page after form submission
- [x] Redirect to Thank You page after successful submission
- [x] Add route for Thank You page in App.tsx
- [x] Update FAQ: remove promo code mention, add home requirement, update scheduling info, add drone opt-in policy
- [x] Add multiple promo codes for different sales reps
- [x] Include sales rep attribution in email notifications
- [x] Update promo code validation to support rep-specific codes
- [x] Update promo code system to accept any code ending in S26 (e.g., MJS26, STS26)

## CRM Development (Phase 1)
- [x] Update database schema for CRM (users, roles, leads, jobs, activities)
- [x] Create user roles system (Owner, Office Staff, Sales Rep, Project Manager)
- [x] Build CRM login page
- [x] Create protected CRM routes
- [x] Build CRM dashboard with lead overview
- [x] Create leads management table with filtering/sorting
- [x] Build job pipeline kanban board
- [x] Create customer profile pages (via lead detail modal)
- [x] Add activity log functionality
- [x] Build team/user management (Owner only)

## CRM Development (Phase 2)
- [x] Document upload functionality for leads (photos, PDFs, storm reports)
- [x] File storage integration with S3
- [x] Document viewer/preview in lead detail
- [x] Scheduling calendar page with appointment management
- [x] Appointment creation with rep assignment
- [x] Calendar view (month view with day appointments)
- [x] Reports export page with filters
- [x] CSV export for lead lists
- [x] PDF report generation

## CRM Redesign (AccuLynx-Style)
- [x] Research AccuLynx UI patterns (navigation, dashboard, dropdowns)
- [x] Implement AccuLynx-style top navigation with dropdown menus
- [x] Redesign dashboard with widget cards and quick actions
- [x] Create CRMLayout component with consistent header/navigation
- [x] Update leads/jobs view with light theme and table style
- [x] Add quick-add buttons (New Job) and action menus
- [x] Update Pipeline page with kanban board
- [x] Update Calendar page with scheduling
- [x] Update Reports page with export functionality
- [x] Update Team page with member management
- [x] Add status badges and color coding

## CRM Color Scheme Update
- [x] Replace black backgrounds (#0a0a0a, #111, black) with dark blue (slate-800/slate-900)
- [x] Change gray text to white for better readability
- [x] Update CRMLayout component colors
- [x] Update Dashboard page colors
- [x] Update Leads, Pipeline, Calendar, Reports, Team page colors

## Dashboard Analytics & Job Detail Page Enhancement
- [x] Add backend endpoints for dashboard analytics (conversion trends, monthly stats)
- [x] Add backend endpoints for comprehensive job detail data
- [x] Enhance Dashboard with analytical charts (Canvas-based)
- [x] Add category tabs to Dashboard (Prospect, Completed, Invoiced, etc.)
- [x] Create dedicated Job Detail page route
- [x] Implement Overview tab with job summary
- [x] Implement Documents tab with upload/download and search
- [x] Implement Photos tab with gallery view and search
- [x] Implement Notes/Messages tab with user communication and search
- [x] Implement Timeline tab with chronological activity history
- [x] Add search functionality across all tabs
- [x] Style job detail page with dark blue theme

## Role-Based Access Control & Edit History
- [x] Add user roles enum to schema (owner, admin, team_lead, sales_rep)
- [x] Create edit_history table to track all changes
- [x] Add teamLeadId field to users for team assignment
- [x] Create role-based access control middleware
- [x] Implement permission helpers (canView, canEdit, canDelete)
- [x] Update CRM router with role-based filtering
- [x] Add edit history logging on all mutations
- [x] Make customer info editable in Job Detail page
- [x] Add edit history view for Owners/Admins
- [x] Update Leads page with role-based job filtering
- [x] Sales Rep: view/edit only assigned jobs
- [x] Team Lead: view assigned jobs + team members' jobs
- [x] Admin: view/edit all, no delete
- [x] Owner: full access including delete and history view
