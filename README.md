# Next Door Exterior Solutions - CRM Platform

A comprehensive roofing CRM platform with job management, proposals, material ordering, and customer portal.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase)
- Google Maps API key
- Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

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

- **Job Management** - Full CRM pipeline from lead to completion
- **Roof Measurements** - Manual takeoff with Google Maps integration
- **Solar Analysis** - Google Solar API integration
- **Proposals** - Digital proposals with e-signatures
- **Material Orders** - Automated material calculations and ordering
- **Customer Portal** - Public job lookup and messaging
- **Team Chat** - Real-time messaging with channels
- **Photo Analysis** - AI-powered damage detection
- **Invoicing** - Invoice generation and tracking
- **Lien Rights** - Automated compliance tracking

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

The backend uses tRPC for type-safe APIs. See `server/api/routers/README.md` for detailed router documentation.

**Main routers:**
- `auth` - Authentication
- `crm` - Job/lead management
- `users` - Team management
- `proposals` - Customer proposals
- `materials` - Material orders
- `invoices` - Invoicing
- `chat` - Team messaging
- `portal` - Customer portal

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
