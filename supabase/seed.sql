-- =====================================================
-- AtomQuest Portal — Demo Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- =====================================================

-- NOTE: You must first create the auth users via Supabase Dashboard
-- or the Supabase JS client. This script assumes the profiles
-- already exist (auto-created by the handle_new_user trigger).

-- Step 0: Ensure schema.sql has been run before this seed script
-- Step 1: Create auth users first via Supabase Dashboard → Auth → Add User
-- Then run this script to set up their profiles and demo data.

-- Update profile details for demo users
-- Replace the UUIDs below with the actual auth.users IDs after creating users

-- Admin
update profiles set
  full_name = 'Admin User',
  role = 'admin',
  department = 'Executive'
where email = 'admin@demo.com';

-- Managers
update profiles set
  full_name = 'Ravi Sharma',
  role = 'manager',
  department = 'Engineering'
where email = 'manager1@demo.com';

update profiles set
  full_name = 'Priya Patel',
  role = 'manager',
  department = 'Sales'
where email = 'manager2@demo.com';

-- Employees (reporting to manager1)
update profiles set
  full_name = 'Ananya Singh',
  role = 'employee',
  department = 'Engineering',
  manager_id = (select id from profiles where email = 'manager1@demo.com')
where email = 'emp1@demo.com';

update profiles set
  full_name = 'Vikram Reddy',
  role = 'employee',
  department = 'Engineering',
  manager_id = (select id from profiles where email = 'manager1@demo.com')
where email = 'emp2@demo.com';

-- Employees (reporting to manager2)
update profiles set
  full_name = 'Sneha Gupta',
  role = 'employee',
  department = 'Sales',
  manager_id = (select id from profiles where email = 'manager2@demo.com')
where email = 'emp3@demo.com';

update profiles set
  full_name = 'Arjun Nair',
  role = 'employee',
  department = 'Sales',
  manager_id = (select id from profiles where email = 'manager2@demo.com')
where email = 'emp4@demo.com';

-- Active Cycle
insert into cycles (year, label, goal_setting_opens, q1_opens, q2_opens, q3_opens, q4_opens, is_active)
values (
  2026,
  'FY 2026-27',
  '2026-03-01',
  '2026-05-01',
  '2026-08-01',
  '2026-11-01',
  '2027-02-01',
  true
) on conflict do nothing;

-- Thrust Areas
insert into thrust_areas (name, cycle_id)
select name, c.id
from (
  values
    ('Innovation'),
    ('Customer Focus'),
    ('Operational Excellence'),
    ('People & Culture'),
    ('Financial Performance')
) as t(name)
cross join (select id from cycles where is_active = true limit 1) c
on conflict do nothing;

-- =====================================================
-- GOAL SHEETS for all employees
-- =====================================================
insert into goal_sheets (employee_id, cycle_id, status)
select p.id, c.id, 'draft'
from profiles p
cross join (select id from cycles where is_active = true limit 1) c
where p.role = 'employee'
on conflict (employee_id, cycle_id) do nothing;

-- =====================================================
-- SAMPLE GOALS for emp1 (Ananya) — 5 goals, weightage = 100
-- =====================================================
do $$
declare
  v_sheet_id uuid;
  v_cycle_id uuid;
  v_thrust_innovation uuid;
  v_thrust_customer uuid;
  v_thrust_ops uuid;
  v_thrust_people uuid;
  v_thrust_finance uuid;
begin
  select id into v_cycle_id from cycles where is_active = true limit 1;
  select id into v_sheet_id from goal_sheets where employee_id = (select id from profiles where email = 'emp1@demo.com') and cycle_id = v_cycle_id;

  select id into v_thrust_innovation from thrust_areas where name = 'Innovation' and cycle_id = v_cycle_id;
  select id into v_thrust_customer from thrust_areas where name = 'Customer Focus' and cycle_id = v_cycle_id;
  select id into v_thrust_ops from thrust_areas where name = 'Operational Excellence' and cycle_id = v_cycle_id;
  select id into v_thrust_people from thrust_areas where name = 'People & Culture' and cycle_id = v_cycle_id;
  select id into v_thrust_finance from thrust_areas where name = 'Financial Performance' and cycle_id = v_cycle_id;

  insert into goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, weightage, sort_order) values
    (v_sheet_id, v_thrust_innovation, 'Launch 2 new product features', 'Design and ship 2 features from the innovation backlog', 'min', 2, 25, 1),
    (v_sheet_id, v_thrust_customer, 'Reduce customer ticket response time', 'Average first response under 4 hours', 'max', 4, 20, 2),
    (v_sheet_id, v_thrust_ops, 'Automate CI/CD pipeline', 'Reduce deployment time from 2hrs to 30min', 'timeline', null, 20, 3),
    (v_sheet_id, v_thrust_people, 'Mentor 2 junior engineers', 'Conduct weekly 1:1s and code reviews', 'min', 2, 15, 4),
    (v_sheet_id, v_thrust_finance, 'Zero production incidents', 'Maintain 99.9% uptime with no P0 incidents', 'zero', 0, 20, 5);
end $$;

-- =====================================================
-- SAMPLE GOALS for emp2 (Vikram) — 4 goals
-- =====================================================
do $$
declare
  v_sheet_id uuid;
  v_cycle_id uuid;
  v_thrust_innovation uuid;
  v_thrust_customer uuid;
  v_thrust_ops uuid;
  v_thrust_finance uuid;
begin
  select id into v_cycle_id from cycles where is_active = true limit 1;
  select id into v_sheet_id from goal_sheets where employee_id = (select id from profiles where email = 'emp2@demo.com') and cycle_id = v_cycle_id;

  select id into v_thrust_innovation from thrust_areas where name = 'Innovation' and cycle_id = v_cycle_id;
  select id into v_thrust_customer from thrust_areas where name = 'Customer Focus' and cycle_id = v_cycle_id;
  select id into v_thrust_ops from thrust_areas where name = 'Operational Excellence' and cycle_id = v_cycle_id;
  select id into v_thrust_finance from thrust_areas where name = 'Financial Performance' and cycle_id = v_cycle_id;

  insert into goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, weightage, sort_order) values
    (v_sheet_id, v_thrust_ops, 'Reduce build time by 40%', 'Optimize webpack and test parallelization', 'max', 40, 30, 1),
    (v_sheet_id, v_thrust_innovation, 'Prototype AI-powered search', 'Build a proof of concept for semantic search', 'timeline', null, 25, 2),
    (v_sheet_id, v_thrust_customer, 'Achieve 95% CSAT score', 'Quarterly customer satisfaction survey target', 'min', 95, 25, 3),
    (v_sheet_id, v_thrust_finance, 'Zero security vulnerabilities', 'All dependencies up to date, no CVEs', 'zero', 0, 20, 4);
end $$;

-- =====================================================
-- SAMPLE GOALS for emp3 (Sneha) — 5 goals
-- =====================================================
do $$
declare
  v_sheet_id uuid;
  v_cycle_id uuid;
  v_thrust_customer uuid;
  v_thrust_ops uuid;
  v_thrust_people uuid;
  v_thrust_finance uuid;
  v_thrust_innovation uuid;
begin
  select id into v_cycle_id from cycles where is_active = true limit 1;
  select id into v_sheet_id from goal_sheets where employee_id = (select id from profiles where email = 'emp3@demo.com') and cycle_id = v_cycle_id;

  select id into v_thrust_customer from thrust_areas where name = 'Customer Focus' and cycle_id = v_cycle_id;
  select id into v_thrust_ops from thrust_areas where name = 'Operational Excellence' and cycle_id = v_cycle_id;
  select id into v_thrust_people from thrust_areas where name = 'People & Culture' and cycle_id = v_cycle_id;
  select id into v_thrust_finance from thrust_areas where name = 'Financial Performance' and cycle_id = v_cycle_id;
  select id into v_thrust_innovation from thrust_areas where name = 'Innovation' and cycle_id = v_cycle_id;

  insert into goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, weightage, sort_order) values
    (v_sheet_id, v_thrust_finance, 'Achieve $2M in quarterly revenue', 'Drive new business and upsell existing accounts', 'min', 2000000, 30, 1),
    (v_sheet_id, v_thrust_customer, 'Maintain 90% client retention', 'Quarterly retention rate across assigned accounts', 'min', 90, 20, 2),
    (v_sheet_id, v_thrust_ops, 'Reduce sales cycle by 15 days', 'Average deal closure time improvement', 'max', 15, 20, 3),
    (v_sheet_id, v_thrust_innovation, 'Launch partner integration program', 'Onboard 3 technology partners', 'min', 3, 15, 4),
    (v_sheet_id, v_thrust_people, 'Conduct 4 product training sessions', 'Internal training for the sales team', 'min', 4, 15, 5);
end $$;

-- =====================================================
-- SAMPLE GOALS for emp4 (Arjun) — 4 goals
-- =====================================================
do $$
declare
  v_sheet_id uuid;
  v_cycle_id uuid;
  v_thrust_customer uuid;
  v_thrust_ops uuid;
  v_thrust_finance uuid;
  v_thrust_people uuid;
begin
  select id into v_cycle_id from cycles where is_active = true limit 1;
  select id into v_sheet_id from goal_sheets where employee_id = (select id from profiles where email = 'emp4@demo.com') and cycle_id = v_cycle_id;

  select id into v_thrust_customer from thrust_areas where name = 'Customer Focus' and cycle_id = v_cycle_id;
  select id into v_thrust_ops from thrust_areas where name = 'Operational Excellence' and cycle_id = v_cycle_id;
  select id into v_thrust_finance from thrust_areas where name = 'Financial Performance' and cycle_id = v_cycle_id;
  select id into v_thrust_people from thrust_areas where name = 'People & Culture' and cycle_id = v_cycle_id;

  insert into goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, weightage, sort_order) values
    (v_sheet_id, v_thrust_finance, 'Close 15 new deals this quarter', 'New logo acquisition target', 'min', 15, 30, 1),
    (v_sheet_id, v_thrust_customer, 'Achieve NPS score of 50+', 'Net Promoter Score for assigned accounts', 'min', 50, 25, 2),
    (v_sheet_id, v_thrust_ops, 'Submit 10 proposals per month', 'Consistent proposal output', 'min', 10, 25, 3),
    (v_sheet_id, v_thrust_people, 'Complete advanced sales certification', 'Complete Level 2 sales training program', 'timeline', null, 20, 4);
end $$;
