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

## Team Management Updates
- [x] Remove role hierarchy & permissions display from Team page
- [x] Change "Invite Member" to "Create Account" button
- [x] Add account creation form (name, email, role, team lead assignment)
- [x] Add backend endpoint for owner to create team member accounts
- [x] Show credentials after account creation for owner to share
- [x] Clean up database - removed test admin accounts

## Email Notification for New Team Accounts
- [x] Set up email service using built-in notification API
- [x] Create welcome email template with login instructions
- [x] Update createTeamAccount endpoint to send welcome email
- [x] Include Manus login URL and role information in email
- [x] Test email delivery

## Pipeline Redesign with Lien Rights Tracking
- [x] Update database schema with new pipeline stages
- [x] Add deal type field (insurance, cash, financed)
- [x] Add completedAt date field for lien rights tracking
- [x] Add lienRightsStatus field (active, warning, critical, expired, legal)
- [x] Create new pipeline stages: Lead, Appointment Set, Prospect, Approved, Project Scheduled, Completed, Invoiced, Lien Legal, Closed Deal
- [x] Update backend with lien rights calculation (90-day window)
- [x] Redesign Pipeline page with new kanban columns
- [x] Add deal type subsections under Approved stage
- [x] Add lien rights countdown timer with urgency indicators
- [x] Add weekly urgency updates for lien rights
- [x] Update Dashboard with new pipeline stages
- [x] Update Leads page with new status options

## Lien Rights Email Notifications
- [x] Create lien rights notification service
- [x] Build email templates for warning (30 days) and critical (14 days) alerts
- [x] Add backend endpoint to check lien rights status and send alerts
- [x] Include job details, days remaining, and action links in emails
- [x] Send notifications to all admin and owner users
- [x] Add manual "Send Lien Rights Alert" button to Dashboard
- [ ] Set up scheduled task for weekly lien rights checks (requires external scheduler)
- [x] Test notification delivery

## Website Dead-End Review
- [x] Review landing page navigation and links
- [x] Review CRM Dashboard navigation and buttons
- [x] Review Leads page functionality
- [x] Review Pipeline page functionality
- [x] Review Calendar page functionality
- [x] Review Reports page functionality
- [x] Review Team page functionality
- [x] Review Job Detail page and all tabs
- [x] Fix footer links (Our Story, Full Services → toast, Contact Us → scroll to form)
- [x] Fix Reports page NaN% conversion rate issue
- [x] Add New Job creation form with dialog to Leads page
- [x] Add createJob backend endpoint for owners/admins

## Customer Portal
- [x] Create public endpoint for job lookup by phone number
- [x] Create endpoint for customer to send message to their job file
- [x] Create endpoint for customer to request a callback
- [x] Add customerStatusMessage field to schema for custom status display
- [x] Add editable Customer Status Message section in Job Detail page
- [x] Build customer portal page with phone number lookup form
- [x] Display only the custom status message to customers (not internal data)
- [x] Add message form to send inquiry to job file
- [x] Add "Request a Call" button with 48 business hours confirmation
- [x] Send notification to admins when customer sends message or requests call
- [x] Add route for customer portal in App.tsx (/portal)

## Role System & Portal Updates
- [x] Replace Admin role with Field Crew role (limited to viewing scope of work and uploading photos)
- [x] Fix portal status field to only update when Enter is pressed
- [x] Add customer messages display in Notes/Messages section of job detail
