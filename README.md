# GoalPilot — Goal Management Portal

A full-lifecycle goal management platform — creation, manager approval, quarterly
check-ins, achievement scoring, and analytics reporting — with three role-based
portals (Employee, Manager, Admin) where authorization is enforced at the database
layer via Postgres row-level security, not just application code.

> This README doubles as the project spec — feature checklists below map to the original BRD.

**[Live Demo](https://goalpilot-two.vercel.app/)**

Demo accounts (seeded fake data only — no real organization or personal data behind
any of them):

| Email | Password | Role |
|---|---|---|
| admin@demo.com | Admin@123 | admin |
| manager1@demo.com | Manager@123 | manager |
| emp1@demo.com | Employee@123 | employee |

## Highlights

- **Azure AD SSO with group-based role assignment** — resolves org hierarchy and
  manager relationships via Microsoft Graph API, not a hand-rolled mapping table
- **Microsoft Teams integration** — adaptive cards fire on goal submission, approval,
  return, and escalation via Power Automate webhooks (current-standard webhooks, not
  the deprecated connector path)
- **Rule-based escalation engine** — configurable thresholds, a 3-level escalation
  chain, admin-managed rules, with a scan-and-log audit trail
- **Zero custom backend** — RLS policies and Postgres triggers enforce authorization
  and data integrity directly; no separate API layer to maintain
- **Full analytics suite** — QoQ trend lines, completion heatmap, goal distribution,
  manager-effectiveness charts, all in Recharts
- **$0 infrastructure** — Supabase + Vercel free tiers, by design

## Architecture

![Architecture Diagram](docs/architecture.drawio.png)

Source: `docs/architecture.drawio` — open in draw.io to edit or export.

### Data flow

| Action | Flow |
|---|---|
| Goal create | Employee → GoalForm (zod validate) → `goals` table → audit trigger fires |
| Goal approve | Manager → ApprovalCard (inline edit) → `goal_sheets.status = 'approved'` → sheet locked |
| Achievement | Employee → AchievementRow (score preview) → `achievements` table → sync trigger propagates to shared goals |
| Check-in | Manager → CheckinModal → `checkin_comments` table |
| Escalation | Admin → run scan → `runEscalationScan()` → `escalation_log` upsert |
| Export | Admin → Reports → `exportToXlsx` / `exportToCsv` → browser download |
| Teams notify | Any workflow event → Power Automate webhook → adaptive card in Teams channel |

## Key design decisions

**RLS instead of a custom API layer.** Authorization lives in Postgres policies, and
data-integrity rules (weightage totals, quarter-window gating, sync-on-achievement)
live in triggers. This means zero backend code to deploy or scale — but it also means
authorization logic is harder to unit test in isolation from the database, and
debugging a denied query means reading a policy, not a stack trace. Worth it here
given the project's scope and the free-tier constraint; a larger system might still
want a thin API layer purely for testability.

**Zustand for local UI state, React Query for server state — kept deliberately
separate.** Mixing them tends to produce components that don't know whether a piece
of state is a cache of the server or the actual source of truth. Keeping the
boundary explicit avoids that class of bug.

**Azure AD SSO with Graph API role sync, not a static role table.** Role and manager
assignment comes from live org-hierarchy data via Microsoft Graph, so the app doesn't
drift out of sync with the actual org chart — the tradeoff is a harder local dev setup
(needs a real Azure AD tenant to test SSO end to end, which is why email/password
demo accounts exist alongside it).

## What it does

Full goal lifecycle (weightage-validated sheets, submission gating, inline approval
editing, admin shared-goal push) · quarterly achievement tracking with live score
computation and manager check-in comments · reporting (department/quarter filters,
XLSX/CSV export, audit log with a red-strikethrough/green-diff view) · admin tooling
(cycle management, org-hierarchy editing, goal unlocking, escalation rules) ·
responsive layout with a mobile bottom-sheet drawer, skeleton loaders, and empty
states throughout.

## Demo walkthrough

1. Log in as employee — dashboard shows goal status, current quarter window,
   progress scores
2. Log in as manager — approval queue, inline weightage editing, team check-ins
3. Log in as admin — org stats, analytics (QoQ trends, heatmap, distribution,
   manager effectiveness), reports with XLSX/CSV export
4. Audit log — red-strikethrough/green-diff view with names resolved
5. Escalation rules — configure a threshold, run a scan, check the log
6. Teams notifications — trigger any workflow event, watch the adaptive card land
   in the corresponding channel
7. "Sign in with Microsoft" — role auto-assigned from Azure AD group membership

## Tech stack

| Layer | Technology | Why / notes |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | strict mode, zero `any` enforced at compile time |
| Styling | Tailwind CSS v4 + shadcn/ui | utility-first, accessible component primitives |
| State | Zustand + React Query | local UI state vs. server state kept separate by design |
| Backend | Supabase (Postgres + Auth + RLS) | RLS + triggers replace a custom API layer |
| Auth | Supabase email + Azure AD SSO | group-based role assignment via Entra ID |
| Notifications | Microsoft Teams (Power Automate webhooks) | current-standard webhooks |
| Charts | Recharts | composable React chart components |
| Forms | react-hook-form + zod | type-safe form validation |
| Export | SheetJS (xlsx) | XLSX + CSV export in-browser |
| Hosting | Vercel + Supabase | zero-config deploy, managed Postgres |

## Setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier)
- (Optional) Azure AD tenant for SSO + Power Automate for Teams notifications

### 1. Supabase

1. Create a project at supabase.com
2. Run `supabase/schema.sql` in the SQL Editor (tables, enums, RLS, triggers)
3. Create auth users under Authentication → Users (see demo accounts table above for
   the shape; use your own for a real setup)
4. Run `supabase/seed.sql` for sample profiles, cycle data, and goals

### 2. Frontend

```bash
npm install
cp .env.local.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# optionally add Teams webhook URLs for notifications
npm run dev        # local dev
npm run build      # production build
```

### 3. Deploy

Push to GitHub → connect to Vercel for auto-deploy. Supabase project is already live
as the backend — nothing else to stand up.

## Project structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # AppShell, Sidebar, TopBar
│   ├── goals/           # GoalForm, GoalSheet, GoalApprovalCard
│   ├── checkins/        # AchievementRow, CheckinModal, ScoreBadge
│   ├── reports/         # Reports, AuditLog
│   └── analytics/       # AnalyticsCharts
├── pages/
│   ├── auth/            # Login, Callback
│   ├── employee/        # MyGoals, MyAchievements
│   ├── manager/         # TeamDashboard, ApprovalQueue, CheckinView
│   └── admin/           # CycleManager, OrgManager, Reports, AuditLog,
│                         # Analytics, EscalationRules, EscalationLog, ...
├── lib/                 # supabase, scoring, validation, cycle, export,
│                         # teams, azure-sync, escalation, graph
├── hooks/                # useAuth, useGoalSheet, useAchievements, use-toast
├── store/                # authStore (Zustand)
└── types/
```
