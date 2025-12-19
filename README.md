# Next Door Exterior Solutions - CRM Platform

A comprehensive roofing CRM platform with job management, proposals, material ordering, customer portal, unified team chat, and mobile PWA support.

## 🎨 Recent Updates (December 2024)

### Chat Widget Improvements
- **Optimistic UI** - Instant message display with 0ms lag, background save with rollback on failure
- **Unread Message Badge** - Real-time notification counter on chat button (shows 1-99+)
- **Fixed Reconnection Loop** - Stabilized useEffect dependencies to prevent subscribe/unsubscribe spam
- **Route Detection** - Chat widget now disabled on auth pages (/login, /forgot-password, etc.)
- **Exponential Backoff** - Added 1s, 2s, 4s retry delays to prevent connection spam
- **Mount Check** - Prevents reconnection if already connected to the same channel
- **Max Retry Limit** - Stops attempting after 3 failed connection attempts
- **OAuth Configuration** - Properly configured for production deployment

### Roof Measurement Tool
- **Vertex Snapping** - Click existing measurement endpoints to snap new lines perfectly
- **Overlay Support** - Draw rakes over eaves vertices with magnetic snapping
- **Visual Snap Indicator** - Yellow marker shows when hovering near snap points
- **Duplicate Tool Removed** - Cleaned up UI by removing redundant measurement tool instance

### Production Fixes
- **Cache Control Headers** - Prevents stale index.html serving, eliminates black screen/404 errors
- **Static Asset Routing** - Fixed images folder routing for logo and static assets
- **PWA Files** - Proper manifest.json and service worker serving

### Futuristic Dashboard UI
- **Neon Gradient Borders** - Vibrant glowing borders on all KPI cards (blue, green, purple)
- **Enhanced Shadow Effects** - Dynamic glowing shadows that intensify on hover
- **Darker Background** - Improved contrast with `#0a0e1a` background color
- **Glowing Icons** - Larger icons in circular containers with neon glow effects
- **White Value Text** - More vibrant display for metrics and statistics
- **Deal Type Cards** - Neon borders on Insurance, Cash, and Financed deal cards

## 📦 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui (styling)
- tRPC for type-safe API calls
- Wouter for routing
- React Query for data fetching

**Backend:**
- Express + tRPC (type-safe APIs)
- PostgreSQL (Supabase)
- Drizzle ORM (database toolkit)
- Google Maps API (geocoding, solar data)
- Gemini AI (proposal generation, photo analysis)
- Nodemailer (email delivery)

**Infrastructure:**
- Supabase (Database + Storage + Auth)
- Render (Backend hosting)
- Vercel (Frontend hosting - optional)
- GitHub Actions (CI/CD)

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
- **Job Management** - Full pipeline from lead to completion with 10 status stages
- **Dashboard Analytics** - Role-based metrics with futuristic UI (glows, gradients, color-coded cards)
- **Calendar Events** - Color-coded scheduling (Inspection=Red, Call=Green, Meeting=Blue, Zoom=Purple)
- **Lien Rights Tracking** - Automated 90-day compliance with urgency levels (warning/critical alerts)
- **CSV Import** - Bulk lead import with validation (restricted to "lead" stage only)
- **Follow-Up System** - Flag jobs needing follow-up with reason tracking

### Customer Experience
- **Roof Measurements** - Manual takeoff with Google Maps integration
- **Solar Analysis** - Google Solar API integration with savings calculator
- **Digital Proposals** - AI-generated proposals with e-signatures
- **Customer Portal** - Public job lookup, messaging, and callback requests
- **Photo Analysis** - AI-powered damage detection with Gemini Vision
- **Manual Payment Recording** - Track checks, cash, wire transfers (no payment processor fees)

### Team Collaboration
- **Unified Messaging** - Real-time chat with channels, DMs, and AI assistant (Zerox)
- **Supabase Realtime** - Stable WebSocket connections with automatic reconnection handling
- **Channel Management** - Owner-only channel creation with role restrictions
- **Event Notifications** - Auto-DM to attendees when events created
- **Team Performance** - Analytics dashboard with leaderboards
- **@Mentions** - Tag team members in messages with notifications
- **Connection Stability** - Smart retry logic prevents infinite reconnection loops

### Finance & Operations
- **Invoicing** - Invoice generation, tracking, and email delivery
- **Commission System** - Weekly bonus tracking with approval workflow (Owner-only)
- **Material Orders** - Automated calculations and supplier integration
- **Time Clock** - Employee time tracking with GPS verification
- **Expense Tracking** - Categorized expenses with tax deduction flags
- **Payment Tracking** - Manual payment recording with automatic revenue updates

### Mobile & PWA
- **Progressive Web App** - Installable mobile experience
- **Offline Support** - Service worker caching for field use
- **Mobile-Optimized UI** - Responsive design with drawer navigation
- **Field Photo Upload** - Public upload endpoint for field staff (no auth required)

### Developer Tools
- **Crash Reporter** - Global error boundary with Supabase logging
- **Production Dashboard** - Real-time metrics and error monitoring
- **Migration Log** - Comprehensive schema change tracking
- **Modular Architecture** - Refactored routers (jobs split into analytics/documents/lien-rights)

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
- Automatic deployment via Vercel Git integration on every push to `main`

## 📄 License

Proprietary - Next Door Exterior Solutions

## 🤝 Support

For issues or questions, contact the development team.

