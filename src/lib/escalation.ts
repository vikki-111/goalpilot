export type RuleType =
  | 'goal_not_submitted'
  | 'goal_not_approved'
  | 'checkin_not_completed';

export function checkEscalations(
  _rule: RuleType,
  thresholdDays: number,
  eventDate: Date,
  now = new Date()
): { shouldEscalate: boolean; level: number } {
  const diffDays = Math.floor(
    (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < thresholdDays) return { shouldEscalate: false, level: 0 };
  if (diffDays < thresholdDays * 2) return { shouldEscalate: true, level: 1 };
  if (diffDays < thresholdDays * 3) return { shouldEscalate: true, level: 2 };
  return { shouldEscalate: true, level: 3 };
}

export const RULE_LABELS: Record<RuleType, string> = {
  goal_not_submitted: 'Goal not submitted',
  goal_not_approved: 'Goal not approved',
  checkin_not_completed: 'Check-in not completed',
};
