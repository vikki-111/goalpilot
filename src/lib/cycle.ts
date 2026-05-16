import type { ActiveWindow, Cycle, Quarter } from '@/types';

export function getActiveWindow(cycle: Cycle, now = new Date()): ActiveWindow {
  const d = now.getTime();
  if (d >= new Date(cycle.q4_opens).getTime()) return 'Q4';
  if (d >= new Date(cycle.q3_opens).getTime()) return 'Q3';
  if (d >= new Date(cycle.q2_opens).getTime()) return 'Q2';
  if (d >= new Date(cycle.q1_opens).getTime()) return 'Q1';
  if (d >= new Date(cycle.goal_setting_opens).getTime()) return 'goal_setting';
  return 'none';
}

export function canSubmitGoals(window: ActiveWindow): boolean {
  return window === 'goal_setting';
}

export function canUpdateAchievement(window: ActiveWindow, quarter: Quarter): boolean {
  return window === quarter || window === 'Q4';
}

export function getQuarterLabel(quarter: Quarter): string {
  const labels: Record<Quarter, string> = {
    Q1: 'Q1 (May–Aug)',
    Q2: 'Q2 (Aug–Nov)',
    Q3: 'Q3 (Nov–Feb)',
    Q4: 'Q4 (Feb–May)',
  };
  return labels[quarter];
}
