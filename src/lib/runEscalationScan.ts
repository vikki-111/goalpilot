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

  for (const rule of rules) {
    if (rule.rule_type === 'goal_not_submitted') {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, full_name, manager_id, goal_sheets(status, cycle_id)')
        .eq('role', 'employee');

      for (const emp of employees ?? []) {
        const gs = (emp.goal_sheets as Array<{ status: string; cycle_id: string }> | undefined) ?? [];
        const cycleSheet = gs.find((s) => s.cycle_id === cycleId);
        if (!cycleSheet || cycleSheet.status === 'draft' || cycleSheet.status === 'returned') {
          const { shouldEscalate, level } = checkEscalations(
            rule.rule_type as RuleType,
            rule.threshold_days,
            new Date(cycleDates.goal_setting_opens),
            now
          );
          if (shouldEscalate) {
            const { data: existing } = await supabase
              .from('escalation_log')
              .select('id, escalation_level, resolved')
              .eq('rule_type', rule.rule_type)
              .eq('employee_id', emp.id)
              .eq('cycle_id', cycleId)
              .eq('resolved', false)
              .order('created_at', { ascending: false })
              .limit(1);

            if (existing?.length && existing[0].escalation_level >= level) {
              continue;
            }

            if (existing?.length) {
              await supabase
                .from('escalation_log')
                .update({ escalation_level: level })
                .eq('id', existing[0].id);
              updated++;
            } else {
              await supabase.from('escalation_log').insert({
                rule_type: rule.rule_type,
                employee_id: emp.id,
                manager_id: emp.manager_id,
                cycle_id: cycleId,
                escalation_level: level,
              });
              created++;
            }
          }
        }
      }
    }

    if (rule.rule_type === 'goal_not_approved') {
      const { data: sheets } = await supabase
        .from('goal_sheets')
        .select('id, employee_id, submitted_at, cycle_id, profiles(manager_id)')
        .eq('status', 'submitted')
        .eq('cycle_id', cycleId);

      for (const sheet of sheets ?? []) {
        if (!sheet.submitted_at) continue;
        const { shouldEscalate, level } = checkEscalations(
          rule.rule_type as RuleType,
          rule.threshold_days,
          new Date(sheet.submitted_at),
          now
        );
        if (shouldEscalate) {
          const profiles = (sheet.profiles as Array<{ manager_id: string }> | undefined)?.[0] ?? null;
          const { data: existing } = await supabase
            .from('escalation_log')
            .select('id, escalation_level')
            .eq('rule_type', rule.rule_type)
            .eq('employee_id', sheet.employee_id)
            .eq('cycle_id', cycleId)
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(1);

          if (existing?.length && existing[0].escalation_level >= level) continue;

          if (existing?.length) {
            await supabase.from('escalation_log').update({ escalation_level: level }).eq('id', existing[0].id);
            updated++;
          } else {
            await supabase.from('escalation_log').insert({
              rule_type: rule.rule_type,
              employee_id: sheet.employee_id,
              manager_id: profiles?.manager_id ?? null,
              cycle_id: cycleId,
              escalation_level: level,
            });
            created++;
          }
        }
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
        .select('id, manager_id, goals(goal_sheets(id, cycle_id), achievements(quarter, submitted_at))')
        .eq('role', 'employee');

      for (const emp of employees ?? []) {
        const goals = (emp.goals as Array<{ goal_sheets: Array<{ id: string; cycle_id: string }>; achievements: Array<{ quarter: string; submitted_at: string | null }> }> | undefined) ?? [];
        const cycleGoals = goals.filter((g) => g.goal_sheets?.some((gs) => gs.cycle_id === cycleId));
        const hasAchievement = cycleGoals.some((g) =>
          g.achievements?.some((a) => a.quarter === currentQuarter && a.submitted_at !== null)
        );

        if (!hasAchievement) {
          const { shouldEscalate, level } = checkEscalations(
            rule.rule_type as RuleType,
            rule.threshold_days,
            new Date(quarterOpenDate),
            now
          );
          if (shouldEscalate) {
            const { data: existing } = await supabase
              .from('escalation_log')
              .select('id, escalation_level')
              .eq('rule_type', rule.rule_type)
              .eq('employee_id', emp.id)
              .eq('cycle_id', cycleId)
              .eq('quarter', currentQuarter)
              .eq('resolved', false)
              .order('created_at', { ascending: false })
              .limit(1);

            if (existing?.length && existing[0].escalation_level >= level) continue;

            if (existing?.length) {
              await supabase.from('escalation_log').update({ escalation_level: level }).eq('id', existing[0].id);
              updated++;
            } else {
              await supabase.from('escalation_log').insert({
                rule_type: rule.rule_type,
                employee_id: emp.id,
                manager_id: emp.manager_id,
                cycle_id: cycleId,
                quarter: currentQuarter,
                escalation_level: level,
              });
              created++;
            }
          }
        }
      }
    }
  }

  return { created, updated };
}
