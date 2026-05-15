export type UserRole = 'employee' | 'manager' | 'admin';
export type UomType = 'min' | 'max' | 'timeline' | 'zero';
export type GoalStatus = 'draft' | 'submitted' | 'approved' | 'returned' | 'locked';
export type CheckinStatus = 'not_started' | 'on_track' | 'completed';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type ActiveWindow = 'goal_setting' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'none';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  manager_id: string | null;
  created_at: string;
}

export interface Cycle {
  id: string;
  year: number;
  label: string;
  goal_setting_opens: string;
  q1_opens: string;
  q2_opens: string;
  q3_opens: string;
  q4_opens: string;
  is_active: boolean;
  created_at: string;
}

export interface ThrustArea {
  id: string;
  name: string;
  cycle_id: string;
  created_at: string;
}

export interface GoalSheet {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: GoalStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  manager_comment: string | null;
  locked_at: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  sheet_id: string;
  thrust_area_id: string | null;
  title: string;
  description: string | null;
  uom_type: UomType;
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  is_shared: boolean;
  shared_parent_id: string | null;
  is_readonly_title: boolean;
  sort_order: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  goal_id: string;
  quarter: Quarter;
  cycle_id: string | null;
  actual_value: number | null;
  actual_date: string | null;
  status: CheckinStatus;
  score: number | null;
  employee_note: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface CheckinComment {
  id: string;
  achievement_id: string;
  manager_id: string | null;
  comment: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

export interface GoalFormData {
  thrust_area_id: string | null;
  title: string;
  description: string;
  uom_type: UomType;
  target_value: string;
  target_date: string;
  weightage: string;
}

export interface AchievementFormData {
  actual_value: string;
  actual_date: string;
  status: CheckinStatus;
  employee_note: string;
}
