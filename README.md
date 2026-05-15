# AtomQuest — Goal Setting & Tracking Portal

Production-grade full-stack web application for employee goal management, quarterly achievement tracking, manager approvals, and analytics.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                     │
│  React 18 + Vite + TypeScript                            │
│  ├── Zustand (local state)                               │
│  ├── React Query (server state)                          │
│  ├── React Router (routing)                              │
│  ├── Tailwind + shadcn/ui (styling)                      │
│  ├── react-hook-form + zod (validation)                  │
│  └── Recharts + SheetJS (charts & export)                │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / REST
┌───────────────────────▼─────────────────────────────────┐
│                 Supabase (Backend)                       │
│  ├── PostgreSQL (database)                               │
│  ├── Auth (email/password + Azure AD SSO)               │
│  ├── RLS (row-level security policies)                   │
│  ├── Realtime (live updates)                             │
│  └── Triggers (audit logging)                            │
└─────────────────────────────────────────────────────────┘
```

## Setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier)

### 1. Supabase Setup

1. Create a project at https://supabase.com
2. Go to SQL Editor and run `supabase/schema.sql` (creates all tables, enums, RLS, triggers)
3. Run `supabase/seed.sql` after creating auth users (see below)
4. Create auth users in Supabase Dashboard → Authentication → Users:

| Email | Password | Role |
|---|---|---|
| admin@demo.com | Admin@123 | admin |
| manager1@demo.com | Manager@123 | manager |
| manager2@demo.com | Manager@123 | manager |
| emp1@demo.com | Employee@123 | employee |
| emp2@demo.com | Employee@123 | employee |
| emp3@demo.com | Employee@123 | employee |
| emp4@demo.com | Employee@123 | employee |

5. After creating users, run `supabase/seed.sql` to populate profiles, cycles, thrust areas, and sample goals.

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start dev server
npm run dev

# Build for production
npm run build
```

### 3. Deploy

- **Frontend**: Push to GitHub → connect to Vercel → auto-deploy
- **Backend**: Supabase project is already live

## Feature Checklist

| Phase | Feature | Status |
|---|---|---|
| 1 | Auth with Supabase email/password | ✓ |
| 1 | Role-based access (employee/manager/admin) | ✓ |
| 1 | Role-aware sidebar navigation | ✓ |
| 1 | Protected routes with redirects | ✓ |
| 1 | Database schema with RLS policies | ✓ |
| 1 | Demo seed data | ✓ |
| 2 | Goal sheet creation & editing | |
| 2 | Weightage validation (100% total, min 10%, max 8 goals) | |
| 2 | Manager approval/return workflow | |
| 2 | Shared goal push from admin | |
| 3 | Quarterly achievement tracking | |
| 3 | Live score computation preview | |
| 3 | Manager check-in comments | |
| 4 | Achievement report table | |
| 4 | XLSX export | |
| 4 | Completion dashboard | |
| 4 | Audit log with JSON diff | |
| 5 | QoQ trend line chart | |
| 5 | Completion heatmap | |
| 5 | Goal distribution charts | |
| 5 | Manager effectiveness chart | |
| 6 | Global error boundary | ✓ |
| 6 | Toast notifications | ✓ |
| 6 | Skeleton loaders | |
| 6 | Empty states | |
| 6 | Responsive layout | ✓ |
| 7 | Azure AD SSO | |
| 7 | Teams notifications | |
| 7 | Org hierarchy sync | |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand + React Query |
| Backend | Supabase (Postgres + Auth + RLS) |
| Charts | Recharts |
| Forms | react-hook-form + zod |
| Export | SheetJS (xlsx) |
| Hosting | Vercel + Supabase |

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # AppShell, Sidebar, TopBar
│   ├── goals/           # Goal creation & approval
│   ├── checkins/        # Achievement tracking
│   ├── reports/         # Reports & export
│   └── analytics/       # Charts & dashboards
├── pages/
│   ├── auth/            # Login
│   ├── employee/        # Employee views
│   ├── manager/         # Manager views
│   └── admin/           # Admin views
├── lib/                 # Supabase client, scoring, validation, cycle logic
├── hooks/               # Custom React hooks
├── store/               # Zustand auth store
├── types/               # TypeScript types + DB types
└── utils/               # Utility functions
```

## License

Internal use only — Atomberg Technologies.
