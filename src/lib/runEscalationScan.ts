import type { SupabaseClient } from '@supabase/supabase-js';
import { checkEscalations, type RuleType } from '@/lib/escalation';
import type { Quarter } from '@/types';

interface EscalationResult {
  created: number;
  updated: number;
}

export async function runEscalationScan(
  supabase: SupabaseClient,
  cycleId: string,
  activeWindow: string,
  cycleDates: { goal_setting_opens: string; q1_opens: string; q2_opens: string; q3_opens: string; q4_opens: string }
): Promise<EscalationResult> {
  const now = new Date();
  let created = 0;
  let updated = 0;

  const { data: rules } = await supabase
    .from('escalation_rules')
    .select('*')
    .eq('is_active', true);

  if (!rules?.length) return { created: 0, updated: 0 };

  async function upsertEscalation(
    ruleType: string,
    employeeId: string,
    managerId: string | null,
    cycle: string,
    quarter: string | null,
    level: number
  ): Promise<void> {
    let query = supabase
      .from('escalation_log')
      .select('id, escalation_level, resolved')
      .eq('rule_type', ruleType)
      .eq('employee_id', employeeId)
      .eq('cycle_id', cycle);

    if (quarter === null) {
      query = query.is('quarter', null);
    } else {
      query = query.eq('quarter', quarter);
    }

    const { data: existing } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.length) {
      if (existing[0].escalation_level >= level) return;
      const { error } = await supabase
        .from('escalation_log')
        .update({ escalation_level: level })
        .eq('id', existing[0].id);
      if (!error) updated++;
    } else {
      const { error } = await supabase
        .from('escalation_log')
        .insert({
          rule_type: ruleType,
          employee_id: employeeId,
          manager_id: managerId,
          cycle_id: cycle,
          quarter,
          escalation_level: level,
          resolved: false,
        });
      if (!error) created++;
    }
  }

  for (const rule of rules) {
    if (rule.rule_type === 'goal_not_submitted') {
      const { data: sheets } = await supabase
        .from('goal_sheets')
        .select('id, employee_id, status, cycle_id')
        .eq('cycle_id', cycleId);

      const { data: employees } = await supabase
        .from('profiles')
        .select('id, manager_id')
        .eq('role', 'employee');

      const employeeMap = new Map<string, string | null>(
        (employees ?? []).map((e) => [e.id, e.manager_id])
      );

      for (const sheet of sheets ?? []) {
        const isUnsubmitted =
          sheet.status === 'draft' || sheet.status === 'returned';

        if (!isUnsubmitted) continue;

        const { shouldEscalate, level } = checkEscalations(
          rule.rule_type as RuleType,
          rule.threshold_days,
          new Date(cycleDates.goal_setting_opens),
          now
        );
        if (!shouldEscalate) continue;

        const managerId = employeeMap.get(sheet.employee_id) ?? null;
        await upsertEscalation(rule.rule_type, sheet.employee_id, managerId, cycleId, null, level);
      }
    }

    if (rule.rule_type === 'goal_not_approved') {
      const { data: sheets } = await supabase
        .from('goal_sheets')
        .select('id, employee_id, status, submitted_at, created_at, cycle_id, profiles!inner(manager_id)')
        .eq('status', 'submitted')
        .eq('cycle_id', cycleId);

      for (const sheet of sheets ?? []) {
        const eventDate = sheet.submitted_at
          ? new Date(sheet.submitted_at)
          : new Date(sheet.created_at);

        const { shouldEscalate, level } = checkEscalations(
          rule.rule_type as RuleType,
          rule.threshold_days,
          eventDate,
          now
        );
        if (!shouldEscalate) continue;

        const profilesArr = sheet.profiles as Array<{ manager_id: string }> | undefined;
        const managerId = profilesArr?.[0]?.manager_id ?? null;
        await upsertEscalation(rule.rule_type, sheet.employee_id, managerId, cycleId, null, level);
      }
    }

    if (rule.rule_type === 'checkin_not_completed') {
      const quarterMap: Record<string, Quarter | null> = {
        Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q4',
      };
      const currentQuarter = quarterMap[activeWindow] ?? null;
      if (!currentQuarter) continue;

      const quarterOpenDate = cycleDates[`${currentQuarter.toLowerCase()}_opens` as keyof typeof cycleDates];
      if (!quarterOpenDate) continue;

      const { data: employees } = await supabase
        .from('profiles')
        .select('id, manager_id')
        .eq('role', 'employee');

      for (const emp of employees ?? []) {
        const { data: achievements } = await supabase
          .from('achievements')
          .select('quarter, submitted_at')
          .eq('employee_id', emp.id)
          .eq('cycle_id', cycleId)
          .eq('quarter', currentQuarter);

        const hasAchievement = (achievements ?? []).some(
          (a) => a.submitted_at !== null
        );

        if (hasAchievement) continue;

        const { shouldEscalate, level } = checkEscalations(
          rule.rule_type as RuleType,
          rule.threshold_days,
          new Date(quarterOpenDate),
          now
        );
        if (!shouldEscalate) continue;

        await upsertEscalation(rule.rule_type, emp.id, emp.manager_id, cycleId, currentQuarter, level);
      }
    }
  }

  return { created, updated };
}
