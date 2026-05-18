# GoalPilot — Goal Setting & Tracking Portal
> Built for AtomQuest Hackathon 2026

GoalPilot is a full-lifecycle goal management portal that covers goal creation → manager approval → quarterly check-ins → achievement scoring → analytics reporting. It provides three distinct role portals (Employee, Manager, Admin) with role-based access enforced at the database level. Every must-have and bonus feature specified in the BRD has been implemented.

**[Live Demo](https://goalpilot-two.vercel.app/)** · admin@demo.com / Admin@123

## What's Included

- **Complete BRD adherence** — all must-have and bonus features implemented
- **Azure AD SSO + org hierarchy sync** — group-based role assignment, manager resolution via Microsoft Graph API
- **Microsoft Teams notifications** — adaptive cards for goal submissions, approvals, returns, escalations, and check-in reminders
- **Rule-based escalation engine** — configurable thresholds, 3-level escalation chain, admin-managed rules
- **Analytics dashboard** — QoQ trend lines, completion heatmap, goal distribution charts, manager effectiveness bars
- **$0 infrastructure** — runs entirely on Supabase free tier + Vercel free tier

## Architecture

![Architecture Diagram](docs/architecture.drawio.png)

Source: `docs/architecture.drawio` — open in draw.io to edit or export.

### Data Flow

| Action | Flow |
|---|---|
| Goal Create | Employee → GoalForm (zod validate) → `goals` table → audit trigger fires |
| Goal Approve | Manager → ApprovalCard (inline edit) → `goal_sheets.status = 'approved'` → sheet locked |
| Achievement | Employee → AchievementRow (score preview) → `achievements` table → sync trigger propagates to shared goals |
| Check-in | Manager → CheckinModal → `checkin_comments` table |
| Escalation | Admin → Run scan → `runEscalationScan()` → `escalation_log` upsert |
| Export | Admin → Reports → `exportToXlsx` / `exportToCsv` → browser download |
| Teams Notify | Any workflow event → Power Automate webhook → Adaptive Card in Teams channel |

## Demo Credentials

| Email | Password | Role | What to Show |
|---|---|---|---|
| admin@demo.com | Admin@123 | admin | Dashboard, Analytics, Reports, Audit Log, Cycle/Org Manager, Unlock Goals, Escalation Rules |
| manager1@demo.com | Manager@123 | manager | Team Dashboard, Approval Queue, Check-ins (Engineering team) |
| manager2@demo.com | Manager@123 | manager | Team Dashboard, Approval Queue, Check-ins (Sales team) |
| emp1@demo.com | Employee@123 | employee | My Goals, My Achievements (Ananya — Engineering) |
| emp2@demo.com | Employee@123 | employee | My Goals, My Achievements (Vikram — Engineering) |
| emp3@demo.com | Employee@123 | employee | My Goals, My Achievements (Sneha — Sales) |
| emp4@demo.com | Employee@123 | employee | My Goals, My Achievements (Arjun — Sales) |

## Demo Walkthrough

1. **Login as employee** → Dashboard shows goal status, quarter window open, progress scores, recent activity
2. **My Achievements** → Achievement data pre-filled for all 4 employees (18 achievements across all UoM types)
3. **Login as manager** → Team Dashboard shows check-in progress, team scores sorted worst→best
4. **Approval Queue** → Review and approve/return goal sheets with inline weightage editing
5. **Check-ins** → View team achievements by quarter, add manager comments
6. **Login as admin** → Org stats (4 employees, 4 approved), Q1 completion rate, department summary, audit log
7. **Analytics** → QoQ trends (Engineering + Sales lines), heatmap (all 4 employees), goal distribution pie, manager effectiveness bars
8. **Reports** → Filter by department/quarter, export to XLSX or CSV
9. **Audit Log** → Red strikethrough → green diff view with employee names resolved
10. **Unlock Goals** → Admin can revert approved/locked sheets to editable state
11. **Cycle Manager** → Create/edit cycles, set active cycle
12. **Org Manager** → Inline edit user department, role, and manager assignment
13. ⭐ **Bonus: Escalation Rules** → Configure thresholds, run scan, view escalation log
14. ⭐ **Bonus: Teams Notifications** → Trigger any event (submit, approve, return, escalation, cycle save) → Adaptive Card appears in the corresponding Teams channel
15. ⭐ **Bonus: Azure AD SSO** → Click "Sign in with Microsoft" → auto-assigned role based on Azure AD group membership

## Active Cycle

| Field | Value |
|---|---|
| Label | FY 2026-27 |
| Goal Setting Opens | 2026-05-18 |
| Q1 Opens | 2026-07-01 |
| Q2 Opens | 2026-10-01 |
| Q3 Opens | 2027-01-01 |
| Q4 Opens | 2027-04-01 |

## Seeded Demo Data

- **4 employees** across 2 departments (Engineering: Ananya, Vikram; Sales: Sneha, Arjun)
- **2 managers** (Ravi Sharma → Engineering, Priya Patel → Sales)
- **1 admin** (Admin User)
- **18 approved goals** (4-5 per employee, spread across all UoM types)
- **18 Q1 achievements** with realistic scores (50%–150%)
- **4 manager check-in comments** (2 per manager)
- **4 audit log entries** from goal approvals
- **3 escalation rules** (goal not submitted, goal not approved, check-in not completed)

## Setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier)
- (Optional) Azure AD tenant for SSO + Power Automate for Teams notifications

### 1. Supabase Setup

1. Create a project at https://supabase.com
2. Go to SQL Editor and run `supabase/schema.sql` (creates all tables, enums, RLS, triggers)
3. Create auth users in Supabase Dashboard → Authentication → Users (use the same credentials listed in the Demo Credentials section above)
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

# (Optional) Teams notification webhooks
# VITE_TEAMS_WEBHOOK_GOAL_SUBMISSIONS=
# VITE_TEAMS_WEBHOOK_APPROVALS=
# VITE_TEAMS_WEBHOOK_ESCALATIONS=
# VITE_TEAMS_WEBHOOK_CHECKIN_REMINDERS=

# Start dev server
npm run dev

# Build for production
npm run build
```

### 3. Deploy

- **Frontend**: Push to GitHub → connect to Vercel → auto-deploy
- **Backend**: Supabase project is already live

## Feature Checklist

### Must-Have — Phase 1 (Goal Creation & Approval)

| Feature | Status |
|---|---|
| Auth with Supabase email/password | ✅ |
| Role-based access (employee/manager/admin) | ✅ |
| Role-aware sidebar navigation | ✅ |
| Protected routes with redirects | ✅ |
| Database schema with RLS policies | ✅ |
| Demo seed data (users, cycle, thrust areas, goals) | ✅ |
| Global error boundary | ✅ |
| Toast notification system | ✅ |
| Goal sheet creation & editing | ✅ |
| Weightage validation (100% total, min 10%, max 8 goals) | ✅ |
| Live weightage progress bar | ✅ |
| Submit flow with validation gating | ✅ |
| Manager approval queue | ✅ |
| Inline goal editing during approval | ✅ |
| Approve & lock / Return with comment | ✅ |
| Admin shared goal push | ✅ |

### Must-Have — Phase 2 (Achievement Tracking & Check-ins)

| Feature | Status |
|---|---|
| Quarterly achievement tracking | ✅ |
| Live score computation preview | ✅ |
| Quarter window gating | ✅ |
| Manager check-in comments | ✅ |
| Score badge color coding | ✅ |
| Achievement report table | ✅ |
| Filter by department/quarter/employee | ✅ |
| XLSX export with timestamped filename | ✅ |
| CSV export with UTF-8 BOM | ✅ |
| Audit log with JSON diff view | ✅ |
| QoQ trend line chart | ✅ |
| Completion heatmap | ✅ |
| Goal distribution pie + bar charts | ✅ |
| Manager effectiveness chart | ✅ |
| Responsive layout (collapsible sidebar) | ✅ |
| Mobile bottom sheet drawer | ✅ |
| Skeleton loaders on data pages | ✅ |
| Empty states for all list views | ✅ |
| Role-specific dashboards (Employee/Manager/Admin) | ✅ |

### Good-to-Have (Bonus Features)

> All bonus features implemented

| Feature | Status |
|---|---|
| Admin goal unlock capability | ✅ |
| Escalation rules + scan + log | ✅ |
| Azure AD SSO (email + Microsoft login) | ✅ |
| Azure AD group-based role assignment | ✅ |
| Teams notifications (5 adaptive card types) | ✅ |
| Org hierarchy sync (Microsoft Graph API) | ✅ |

## Tech Stack

| Layer | Technology | Why / Notes |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | strict mode, zero `any` types enforced at compile time |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first with accessible component primitives |
| State | Zustand + React Query | local UI state vs server state kept separate by design |
| Backend | Supabase (Postgres + Auth + RLS) | RLS + triggers replace a custom API layer — zero backend code |
| Auth | Supabase Email + Azure AD SSO | Group-based role assignment via Entra ID |
| Notifications | Microsoft Teams (Power Automate webhooks) | current standard webhooks, not deprecated connectors |
| Charts | Recharts | Composable React chart components |
| Forms | react-hook-form + zod | Type-safe form validation |
| Export | SheetJS (xlsx) | XLSX + CSV export in-browser |
| Hosting | Vercel + Supabase | Zero-config deploy + managed Postgres |

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
│   ├── auth/            # Login, Callback
│   ├── employee/        # MyGoals, MyAchievements
│   ├── manager/         # TeamDashboard, ApprovalQueue, CheckinView
│   └── admin/           # CycleManager, OrgManager, AdminCheckins, AdminUnlock, SharedGoalPush, Reports, AuditLog, Analytics, EscalationRules, EscalationLog
├── lib/                 # supabase, scoring, validation, cycle, export, supabase-helpers, teams, azure-sync, escalation, graph
├── hooks/               # useAuth, useGoalSheet, useAchievements, use-toast
├── store/               # authStore (Zustand)
├── types/               # TypeScript types
└── utils/               # cn utility
```
