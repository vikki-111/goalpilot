export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: 'employee' | 'manager' | 'admin';
          department: string | null;
          manager_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: 'employee' | 'manager' | 'admin';
          department?: string | null;
          manager_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: 'employee' | 'manager' | 'admin';
          department?: string | null;
          manager_id?: string | null;
          created_at?: string;
        };
      };
      cycles: {
        Row: {
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
        };
        Insert: {
          id?: string;
          year: number;
          label: string;
          goal_setting_opens: string;
          q1_opens: string;
          q2_opens: string;
          q3_opens: string;
          q4_opens: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          label?: string;
          goal_setting_opens?: string;
          q1_opens?: string;
          q2_opens?: string;
          q3_opens?: string;
          q4_opens?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      thrust_areas: {
        Row: {
          id: string;
          name: string;
          cycle_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cycle_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cycle_id?: string;
          created_at?: string;
        };
      };
      goal_sheets: {
        Row: {
          id: string;
          employee_id: string;
          cycle_id: string;
          status: 'draft' | 'submitted' | 'approved' | 'returned' | 'locked';
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          manager_comment: string | null;
          locked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          cycle_id: string;
          status?: 'draft' | 'submitted' | 'approved' | 'returned' | 'locked';
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          manager_comment?: string | null;
          locked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          cycle_id?: string;
          status?: 'draft' | 'submitted' | 'approved' | 'returned' | 'locked';
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          manager_comment?: string | null;
          locked_at?: string | null;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          sheet_id: string;
          thrust_area_id: string | null;
          title: string;
          description: string | null;
          uom_type: 'min' | 'max' | 'timeline' | 'zero';
          target_value: number | null;
          target_date: string | null;
          weightage: number;
          is_shared: boolean;
          shared_parent_id: string | null;
          is_readonly_title: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          thrust_area_id?: string | null;
          title: string;
          description?: string | null;
          uom_type: 'min' | 'max' | 'timeline' | 'zero';
          target_value?: number | null;
          target_date?: string | null;
          weightage: number;
          is_shared?: boolean;
          shared_parent_id?: string | null;
          is_readonly_title?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sheet_id?: string;
          thrust_area_id?: string | null;
          title?: string;
          description?: string | null;
          uom_type?: 'min' | 'max' | 'timeline' | 'zero';
          target_value?: number | null;
          target_date?: string | null;
          weightage?: number;
          is_shared?: boolean;
          shared_parent_id?: string | null;
          is_readonly_title?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          goal_id: string;
          quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
          cycle_id: string | null;
          actual_value: number | null;
          actual_date: string | null;
          status: 'not_started' | 'on_track' | 'completed';
          score: number | null;
          employee_note: string | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
          cycle_id?: string | null;
          actual_value?: number | null;
          actual_date?: string | null;
          status?: 'not_started' | 'on_track' | 'completed';
          score?: number | null;
          employee_note?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
          cycle_id?: string | null;
          actual_value?: number | null;
          actual_date?: string | null;
          status?: 'not_started' | 'on_track' | 'completed';
          score?: number | null;
          employee_note?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
      };
      checkin_comments: {
        Row: {
          id: string;
          achievement_id: string;
          manager_id: string | null;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          achievement_id: string;
          manager_id?: string | null;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          achievement_id?: string;
          manager_id?: string | null;
          comment?: string;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          before_state: Json | null;
          after_state: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          before_state?: Json | null;
          after_state?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          before_state?: Json | null;
          after_state?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}
