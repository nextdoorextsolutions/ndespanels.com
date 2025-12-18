# Next Door Exterior Solutions - CRM Platform

A comprehensive roofing CRM platform with job management, proposals, material ordering, and customer portal.

## 📦 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- tRPC for type-safe API calls
- Wouter for routing

**Backend:**
- Express + tRPC
- PostgreSQL (Supabase)
- Drizzle ORM
- Google Maps API
- Gemini AI

**Infrastructure:**
- Supabase (Database + Storage + Auth)
- Render (Backend hosting)
- Vercel (Frontend hosting)

## 🗂️ Project Structure

```
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and tRPC client
│   │   └── hooks/       # Custom React hooks
├── server/              # Backend Express + tRPC
│   ├── _core/           # Core server setup
│   ├── api/routers/     # Domain-specific tRPC routers
│   ├── lib/             # Shared utilities
│   └── routers.ts       # Main router assembly
├── drizzle/             # Database schema and migrations
│   ├── schema.ts        # Drizzle schema definitions
│   └── migrations/      # SQL migration files
└── shared/              # Shared types between client/server
```

## 🔑 Environment Variables

Required variables (see `.env` for full list):

```env
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...

# APIs
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

## 📚 Key Features

### Core CRM
- **Job Management** - Full pipeline from lead to completion with status tracking
- **Dashboard Analytics** - Role-based metrics with futuristic UI (glows, gradients, color-coded cards)
- **Calendar Events** - Color-coded scheduling (Inspection=Red, Call=Green, Meeting=Blue, Zoom=Purple)
- **Lien Rights Tracking** - Automated 90-day compliance with urgency levels
- **CSV Import** - Bulk lead import with validation

### Customer Experience
- **Roof Measurements** - Manual takeoff with Google Maps integration
- **Solar Analysis** - Google Solar API integration with savings calculator
- **Digital Proposals** - AI-generated proposals with e-signatures
- **Customer Portal** - Public job lookup, messaging, and callback requests
- **Photo Analysis** - AI-powered damage detection with Gemini Vision

### Team Collaboration
- **Unified Messaging** - Real-time chat with channels, DMs, and AI assistant (Zerox)
- **Channel Management** - Owner-only channel creation with role restrictions
- **Event Notifications** - Auto-DM to attendees when events created
- **Team Performance** - Analytics dashboard with leaderboards

### Finance & Operations
- **Invoicing** - Invoice generation, tracking, and email delivery
- **Commission System** - Weekly bonus tracking with approval workflow (Owner-only)
- **Material Orders** - Automated calculations and supplier integration
- **Time Clock** - Employee time tracking with GPS verification
- **Expense Tracking** - Categorized expenses with tax deduction flags

### Mobile & PWA
- **Progressive Web App** - Installable mobile experience
- **Offline Support** - Service worker caching for field use
- **Mobile-Optimized UI** - Responsive design with drawer navigation

### Developer Tools
- **Crash Reporter** - Global error boundary with Supabase logging
- **Production Dashboard** - Real-time metrics and error monitoring
- **Migration Log** - Comprehensive schema change tracking

## 🔐 User Roles

- **Owner** - Full system access
- **Admin** - Full access except system settings
- **Office** - Finance and administrative access
- **Team Lead** - Manage team members' jobs
- **Sales Rep** - Manage assigned jobs
- **Field Crew** - Limited field upload access

## 📊 Database Migrations

See `MIGRATIONS.md` for the complete list of database migrations and their purposes.

## 🛠️ Development

```bash
# Start dev server (frontend + backend)
npm run dev

# Run database migrations
npm run db:push

# Generate migration from schema changes
npm run db:generate

# Type checking
npm run typecheck

# Build for production
npm run build
```

## 📝 API Documentation

The backend uses tRPC for type-safe APIs. All routers are located in `server/api/routers/`.

**Main Routers:**
- `auth` - Authentication and session management
- `crm` (jobs) - Job/lead management with role-based filtering
- `users` - Team management and permissions
- `proposals` - Customer proposals with AI generation
- `materials` - Material orders and kit management
- `invoices` - Invoice CRUD and email delivery
- `messaging` - Unified chat (channels, DMs, AI assistant)
- `events` - Calendar events with notifications
- `portal` - Customer portal (public access)
- `analytics` - Team performance metrics
- `commissions` - Bonus tracking and approval workflow
- `leads` - CSV import and lead management
- `estimates` - Estimate generation
- `utility` - Error reporting and system utilities

## 🚢 Deployment

**Backend (Render):**
- Build command: `npm run build:server`
- Start command: `npm run start`

**Frontend (Vercel):**
- Build command: `npm run build:client`
- Output directory: `dist/public`

## 📄 License

Proprietary - Next Door Exterior Solutions

## 🤝 Support

For issues or questions, contact the development team.
