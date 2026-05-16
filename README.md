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

## Demo Credentials

| Email | Password | Role | What to Show |
|---|---|---|---|
| admin@demo.com | Admin@123 | admin | Dashboard, Analytics, Reports, Audit Log, Cycle/Org Manager |
| manager1@demo.com | Manager@123 | manager | Team Dashboard, Approval Queue, Check-ins (Engineering team) |
| manager2@demo.com | Manager@123 | manager | Team Dashboard, Approval Queue, Check-ins (Sales team) |
| emp1@demo.com | Employee@123 | employee | My Goals, My Achievements (Ananya — Engineering) |
| emp2@demo.com | Employee@123 | employee | My Goals, My Achievements (Vikram — Engineering) |
| emp3@demo.com | Employee@123 | employee | My Goals, My Achievements (Sneha — Sales) |
| emp4@demo.com | Employee@123 | employee | My Goals, My Achievements (Arjun — Sales) |

## Demo Walkthrough

1. **Login as employee** → Dashboard shows goal status, current quarter, progress scores, recent activity
2. **My Achievements** → Q1 data is filled for all 4 employees, Q2 partially filled for Ananya & Sneha
3. **Login as manager** → Team Dashboard shows pending approvals, check-in progress, team scores
4. **Approval Queue** → Review and approve/return goal sheets
5. **Check-ins** → View team achievements, add manager comments
6. **Login as admin** → Org stats, cycle management, department summary, audit log, analytics
7. **Analytics** → QoQ trends (Engineering + Sales lines), heatmap, goal distribution, manager effectiveness
8. **Reports** → Filter by department/quarter, export to XLSX
9. **Audit Log** → Red strikethrough → green diff view for all changes

## Setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier)

### 1. Supabase Setup

1. Create a project at https://supabase.com
2. Go to SQL Editor and run `supabase/schema.sql` (creates all tables, enums, RLS, triggers)
3. Create auth users in Supabase Dashboard → Authentication → Users:

| Email | Password | Role |
|---|---|---|
| admin@demo.com | Admin@123 | admin |
| manager1@demo.com | Manager@123 | manager |
| manager2@demo.com | Manager@123 | manager |
| emp1@demo.com | Employee@123 | employee |
| emp2@demo.com | Employee@123 | employee |
| emp3@demo.com | Employee@123 | employee |
| emp4@demo.com | Employee@123 | employee |

4. Run `supabase/seed.sql` to populate profiles, cycle, thrust areas, and sample goals.

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
| **1** | Auth with Supabase email/password | ✅ |
| **1** | Role-based access (employee/manager/admin) | ✅ |
| **1** | Role-aware sidebar navigation | ✅ |
| **1** | Protected routes with redirects | ✅ |
| **1** | Database schema with RLS policies | ✅ |
| **1** | Demo seed data (users, cycle, thrust areas, goals) | ✅ |
| **1** | Global error boundary | ✅ |
| **1** | Toast notification system | ✅ |
| **2** | Goal sheet creation & editing | ✅ |
| **2** | Weightage validation (100% total, min 10%, max 8 goals) | ✅ |
| **2** | Live weightage progress bar | ✅ |
| **2** | Submit flow with validation gating | ✅ |
| **2** | Manager approval queue | ✅ |
| **2** | Inline goal editing during approval | ✅ |
| **2** | Approve & lock / Return with comment | ✅ |
| **2** | Admin shared goal push | ✅ |
| **3** | Quarterly achievement tracking | ✅ |
| **3** | Live score computation preview | ✅ |
| **3** | Quarter window gating | ✅ |
| **3** | Manager check-in comments | ✅ |
| **3** | Score badge color coding | ✅ |
| **4** | Achievement report table | ✅ |
| **4** | Filter by department/quarter/employee | ✅ |
| **4** | XLSX export with timestamped filename | ✅ |
| **4** | Audit log with JSON diff view | ✅ |
| **5** | QoQ trend line chart | ✅ |
| **5** | Completion heatmap | ✅ |
| **5** | Goal distribution pie + bar charts | ✅ |
| **5** | Manager effectiveness chart | ✅ |
| **6** | Responsive layout (collapsible sidebar) | ✅ |
| **6** | Mobile bottom sheet drawer | ✅ |
| **6** | Skeleton loaders on data pages | ✅ |
| **6** | Empty states for all list views | ✅ |
| **7** | Azure AD SSO | ⏳ Deferred |
| **7** | Teams notifications | ⏳ Deferred |
| **7** | Org hierarchy sync | ⏳ Deferred |

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
│   ├── goals/           # GoalForm, GoalSheet, GoalApprovalCard
│   ├── checkins/        # AchievementRow, CheckinModal, ScoreBadge
│   ├── reports/         # Reports, AuditLog
│   └── analytics/       # AnalyticsCharts (4 chart types)
├── pages/
│   ├── auth/            # Login
│   ├── employee/        # MyGoals, MyAchievements
│   ├── manager/         # TeamDashboard, ApprovalQueue, CheckinView
│   └── admin/           # CycleManager, OrgManager, SharedGoalPush, Reports, AuditLog, Analytics
├── lib/                 # supabase, scoring, validation, cycle, export, supabase-helpers
├── hooks/               # useAuth, useGoalSheet, useAchievements, use-toast
├── store/               # authStore (Zustand)
├── types/               # TypeScript types
└── utils/               # cn utility
```

## License

Internal use only — Atomberg Technologies.
