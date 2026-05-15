export const GOAL_RULES = {
  MAX_GOALS: 8,
  MIN_WEIGHTAGE: 10,
  TOTAL_WEIGHTAGE: 100,
} as const;

export function validateGoalSheet(goals: { weightage: number }[]): string | null {
  if (goals.length === 0) {
    return 'At least one goal is required.';
  }
  if (goals.length > GOAL_RULES.MAX_GOALS) {
    return `Maximum ${GOAL_RULES.MAX_GOALS} goals allowed.`;
  }
  if (goals.some(g => g.weightage < GOAL_RULES.MIN_WEIGHTAGE)) {
    return `Each goal must have at least ${GOAL_RULES.MIN_WEIGHTAGE}% weightage.`;
  }
  const total = goals.reduce((sum, g) => sum + g.weightage, 0);
  if (total !== GOAL_RULES.TOTAL_WEIGHTAGE) {
    return `Total weightage must equal 100%. Current: ${total}%.`;
  }
  return null;
}
