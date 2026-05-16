-- =====================================================
-- AtomQuest Portal — Complete Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- =====================================================

-- ENUMS
create type user_role as enum ('employee', 'manager', 'admin');
create type uom_type as enum ('min', 'max', 'timeline', 'zero');
create type goal_status as enum ('draft', 'submitted', 'approved', 'returned', 'locked');
create type checkin_status as enum ('not_started', 'on_track', 'completed');
create type quarter as enum ('Q1', 'Q2', 'Q3', 'Q4');

-- USERS (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'employee',
  department text,
  manager_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- GOAL CYCLES
create table cycles (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  label text not null,
  goal_setting_opens date not null,
  q1_opens date not null,
  q2_opens date not null,
  q3_opens date not null,
  q4_opens date not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- THRUST AREAS
create table thrust_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cycle_id uuid references cycles(id) on delete cascade,
  created_at timestamptz default now()
);

-- GOAL SHEETS
create table goal_sheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles(id) on delete cascade,
  cycle_id uuid references cycles(id) on delete cascade,
  status goal_status default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  manager_comment text,
  locked_at timestamptz,
  created_at timestamptz default now(),
  unique(employee_id, cycle_id)
);

-- GOALS
create table goals (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references goal_sheets(id) on delete cascade,
  thrust_area_id uuid references thrust_areas(id),
  title text not null,
  description text,
  uom_type uom_type not null,
  target_value numeric,
  target_date date,
  weightage numeric not null check (weightage >= 10 and weightage <= 100),
  is_shared boolean default false,
  shared_parent_id uuid references goals(id),
  is_readonly_title boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- QUARTERLY ACHIEVEMENTS
create table achievements (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade,
  quarter quarter not null,
  cycle_id uuid references cycles(id),
  actual_value numeric,
  actual_date date,
  status checkin_status default 'not_started',
  score numeric,
  employee_note text,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  unique(goal_id, quarter, cycle_id)
);

-- MANAGER CHECK-IN COMMENTS
create table checkin_comments (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid references achievements(id) on delete cascade,
  manager_id uuid references profiles(id),
  comment text not null,
  created_at timestamptz default now()
);

-- AUDIT LOG
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz default now()
);

-- =====================================================
-- INDEXES
-- =====================================================
create index idx_profiles_manager on profiles(manager_id);
create index idx_goal_sheets_employee on goal_sheets(employee_id);
create index idx_goal_sheets_cycle on goal_sheets(cycle_id);
create index idx_goal_sheets_status on goal_sheets(status);
create index idx_goals_sheet on goals(sheet_id);
create index idx_goals_thrust on goals(thrust_area_id);
create index idx_achievements_goal on achievements(goal_id);
create index idx_achievements_quarter on achievements(quarter);
create index idx_achievements_cycle on achievements(cycle_id);
create index idx_checkin_comments_achievement on checkin_comments(achievement_id);
create index idx_audit_log_entity on audit_log(entity_type, entity_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Profiles
alter table profiles enable row level security;
create policy "profiles_select_all" on profiles
  for select using (true);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Goal sheets
alter table goal_sheets enable row level security;
create policy "goal_sheet_all" on goal_sheets
  for all using (
    employee_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
    or exists (
      select 1 from profiles mgr
      where mgr.id = auth.uid()
      and mgr.role = 'manager'
      and mgr.id = (select manager_id from profiles where id = employee_id)
    )
  );

-- Goals
alter table goals enable row level security;
create policy "goals_all" on goals
  for all using (
    exists (
      select 1 from goal_sheets gs
      where gs.id = sheet_id
      and (
        gs.employee_id = auth.uid()
        or exists (
          select 1 from profiles p
          where p.id = auth.uid()
          and p.role = 'admin'
        )
        or exists (
          select 1 from profiles mgr
          where mgr.id = auth.uid()
          and mgr.role = 'manager'
          and mgr.id = (select manager_id from profiles where id = gs.employee_id)
        )
      )
    )
  );

-- Achievements
alter table achievements enable row level security;
create policy "achievements_all" on achievements
  for all using (
    exists (
      select 1 from goals g
      join goal_sheets gs on gs.id = g.sheet_id
      where g.id = goal_id
      and (
        gs.employee_id = auth.uid()
        or exists (
          select 1 from profiles p
          where p.id = auth.uid()
          and p.role = 'admin'
        )
        or exists (
          select 1 from profiles mgr
          where mgr.id = auth.uid()
          and mgr.role = 'manager'
          and mgr.id = (select manager_id from profiles where id = gs.employee_id)
        )
      )
    )
  );

-- Cycles (everyone reads, admin writes)
alter table cycles enable row level security;
create policy "cycles_select" on cycles for select using (true);
create policy "cycles_admin" on cycles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Thrust areas (everyone reads, admin writes)
alter table thrust_areas enable row level security;
create policy "thrust_areas_select" on thrust_areas for select using (true);
create policy "thrust_areas_admin" on thrust_areas
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Check-in comments
alter table checkin_comments enable row level security;
create policy "checkin_comments_all" on checkin_comments
  for all using (
    exists (
      select 1 from achievements a
      join goals g on g.id = a.goal_id
      join goal_sheets gs on gs.id = g.sheet_id
      where a.id = achievement_id
      and (
        gs.employee_id = auth.uid()
        or exists (
          select 1 from profiles p
          where p.id = auth.uid()
          and p.role = 'admin'
        )
        or exists (
          select 1 from profiles mgr
          where mgr.id = auth.uid()
          and mgr.role = 'manager'
          and mgr.id = (select manager_id from profiles where id = gs.employee_id)
        )
      )
    )
  );

-- Audit log (admin only)
alter table audit_log enable row level security;
create policy "audit_admin_only" on audit_log
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "audit_insert" on audit_log
  for insert with check (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Post-lock audit log trigger
create or replace function log_post_lock_changes()
returns trigger as $$
begin
  if old.locked_at is not null then
    insert into audit_log (actor_id, entity_type, entity_id, action, before_state, after_state)
    values (auth.uid(), tg_table_name, new.id, 'update', to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger goals_audit_trigger
after update on goals
for each row execute function log_post_lock_changes();

create trigger goal_sheets_audit_trigger
after update on goal_sheets
for each row execute function log_post_lock_changes();

-- =====================================================
-- TRIGGER: Sync shared goal achievements
-- =====================================================
create or replace function sync_shared_achievements()
returns trigger as $$
declare
  v_goal_id uuid;
  v_shared_parent uuid;
  v_quarter quarter;
  v_cycle_id uuid;
begin
  v_goal_id := (select goal_id from achievements where id = new.id);
  v_shared_parent := (select shared_parent_id from goals where id = v_goal_id);
  v_quarter := new.quarter;
  v_cycle_id := new.cycle_id;

  if v_shared_parent is not null and (
    (old.actual_value is distinct from new.actual_value) or
    (old.actual_date is distinct from new.actual_date) or
    (old.status is distinct from new.status) or
    (old.score is distinct from new.score)
  ) then
    update achievements a
    set
      actual_value = new.actual_value,
      actual_date = new.actual_date,
      status = new.status,
      score = new.score,
      submitted_at = now()
    from goals g
    where a.goal_id = g.id
      and g.shared_parent_id = v_shared_parent
      and a.quarter = v_quarter
      and a.cycle_id = v_cycle_id
      and a.id != new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger achievements_shared_sync_trigger
after update on achievements
for each row execute function sync_shared_achievements();

-- =====================================================
-- HELPER: Auto-create profile on signup
-- =====================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
