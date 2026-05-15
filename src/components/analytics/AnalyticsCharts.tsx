import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { getScoreColor } from '@/lib/scoring';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface QoQData {
  quarter: string;
  [key: string]: string | number;
}

interface HeatmapCell {
  employee: string;
  department: string;
  Q1: number | null;
  Q2: number | null;
  Q3: number | null;
  Q4: number | null;
}

export function QoQTrendChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-qoq'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select(`
          quarter,
          score,
          goals!inner(
            goal_sheets!inner(
              profiles!goal_sheets_employee_id_fkey(department)
            )
          )
        `);
      if (error) throw error;

      const byDept: Record<string, Record<string, { total: number; count: number }>> = {};

      for (const row of data ?? []) {
        const goalData = row.goals as unknown as Record<string, unknown> | null;
        const gs = goalData?.goal_sheets as unknown as Record<string, unknown> | null;
        const profiles = gs?.profiles as unknown as Record<string, unknown> | null;
        const dept = (profiles?.department as string) ?? 'Unknown';
        const quarter = row.quarter as string;
        const score = row.score as number | null;

        if (!byDept[dept]) byDept[dept] = {};
        if (!byDept[dept][quarter]) byDept[dept][quarter] = { total: 0, count: 0 };

        if (score !== null) {
          byDept[dept][quarter].total += score;
          byDept[dept][quarter].count += 1;
        }
      }

      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const result: QoQData[] = quarters.map((q) => {
        const obj: QoQData = { quarter: q };
        for (const [dept, values] of Object.entries(byDept)) {
          const v = values[q];
          obj[dept] = v && v.count > 0 ? Math.round(v.total / v.count) : 0;
        }
        return obj;
      });

      return result;
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground text-sm">No trend data available.</p>;

  const departments = Object.keys(data[0]).filter((k) => k !== 'quarter');

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="quarter" />
        <YAxis domain={[0, 150]} label={{ value: 'Avg Score %', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        {departments.map((dept, i) => (
          <Line key={dept} type="monotone" dataKey={dept} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CompletionHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select(`
          quarter,
          score,
          goals!inner(
            goal_sheets!inner(
              employee_id,
              profiles!goal_sheets_employee_id_fkey(full_name, department)
            )
          )
        `);
      if (error) throw error;

      const byEmployee: Record<string, { name: string; dept: string; scores: Record<string, number[]> }> = {};

      for (const row of data ?? []) {
        const goalData = row.goals as unknown as Record<string, unknown> | null;
        const gs = goalData?.goal_sheets as unknown as Record<string, unknown> | null;
        const profiles = gs?.profiles as unknown as Record<string, unknown> | null;

        const empId = gs?.employee_id as string;
        const quarter = row.quarter as string;
        const score = row.score as number | null;

        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            name: (profiles?.full_name as string) ?? 'Unknown',
            dept: (profiles?.department as string) ?? 'Unknown',
            scores: { Q1: [], Q2: [], Q3: [], Q4: [] },
          };
        }
        if (score !== null) {
          byEmployee[empId].scores[quarter].push(score);
        }
      }

      return Object.values(byEmployee).map((emp) => ({
        employee: emp.name,
        department: emp.dept,
        Q1: emp.scores.Q1.length ? Math.round(emp.scores.Q1.reduce((a, b) => a + b, 0) / emp.scores.Q1.length) : null,
        Q2: emp.scores.Q2.length ? Math.round(emp.scores.Q2.reduce((a, b) => a + b, 0) / emp.scores.Q2.length) : null,
        Q3: emp.scores.Q3.length ? Math.round(emp.scores.Q3.reduce((a, b) => a + b, 0) / emp.scores.Q3.length) : null,
        Q4: emp.scores.Q4.length ? Math.round(emp.scores.Q4.reduce((a, b) => a + b, 0) / emp.scores.Q4.length) : null,
      })) as HeatmapCell[];
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground text-sm">No heatmap data available.</p>;

  const quarters: (keyof HeatmapCell)[] = ['Q1', 'Q2', 'Q3', 'Q4'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 font-medium">Employee</th>
            {quarters.map((q) => (
              <th key={q} className="p-2 text-center font-medium">{q}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.employee}>
              <td className="p-2">
                <div>
                  <p className="font-medium">{row.employee}</p>
                  <p className="text-xs text-muted-foreground">{row.department}</p>
                </div>
              </td>
              {quarters.map((q) => {
                const score = row[q] as number | null;
                return (
                  <td key={q} className="p-2 text-center">
                    {score !== null ? (
                      <div
                        className={`inline-flex items-center justify-center w-12 h-8 rounded-md text-xs font-semibold ${getScoreColor(score)}`}
                        title={`${row.employee} - ${q}: ${score}%`}
                      >
                        {score}%
                      </div>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GoalDistributionChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('uom_type, thrust_areas(name)');
      if (error) throw error;

      const byThrust: Record<string, number> = {};
      const byUom: Record<string, number> = {};

      for (const goal of data ?? []) {
        const ta = goal.thrust_areas as unknown as Record<string, unknown> | null;
        const thrust = (ta?.name as string) ?? 'Unassigned';
        byThrust[thrust] = (byThrust[thrust] ?? 0) + 1;
        byUom[goal.uom_type] = (byUom[goal.uom_type] ?? 0) + 1;
      }

      return {
        byThrust: Object.entries(byThrust).map(([name, value]) => ({ name, value })),
        byUom: Object.entries(byUom).map(([name, value]) => ({ name, value })),
      };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return <p className="text-muted-foreground text-sm">No distribution data available.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h4 className="text-sm font-medium mb-2">By Thrust Area</h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data.byThrust}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.byThrust.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">By UoM Type</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.byUom}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ManagerEffectivenessChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-manager-effectiveness'],
    queryFn: async () => {
      const { data: managers, error: mgrError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'manager');
      if (mgrError) throw mgrError;

      const results = [];
      for (const mgr of managers ?? []) {
        const mgrId = mgr.id as string;
        const mgrName = mgr.full_name as string;

        const { data: employees } = await supabase
          .from('profiles')
          .select('id')
          .eq('manager_id', mgrId);

        const empIds = ((employees ?? []) as Array<{ id: string }>).map((e) => e.id);
        const totalEmps = empIds.length;
        if (totalEmps === 0) continue;

        const { data: sheets } = await supabase
          .from('goal_sheets')
          .select('id')
          .in('employee_id', empIds);

        const sheetIds = ((sheets ?? []) as Array<{ id: string }>).map((s) => s.id);
        if (sheetIds.length === 0) continue;

        const { data: goals } = await supabase
          .from('goals')
          .select('id')
          .in('sheet_id', sheetIds);

        const goalIds = ((goals ?? []) as Array<{ id: string }>).map((g) => g.id);
        if (goalIds.length === 0) continue;

        const { data: achievements } = await supabase
          .from('achievements')
          .select('id, status')
          .in('goal_id', goalIds);

        const allAchievements = (achievements ?? []) as Array<{ id: string; status: string }>;
        const completedCount = allAchievements.filter((a) => a.status === 'completed').length;
        const totalPossible = allAchievements.length;
        const percentage = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;

        results.push({ name: mgrName, percentage, completed: completedCount, total: totalPossible });
      }

      return results;
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground text-sm">No manager data available.</p>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 100]} label={{ value: 'Completion %', position: 'insideBottom', offset: -5 }} />
        <YAxis type="category" dataKey="name" width={120} />
        <Tooltip />
        <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.percentage >= 80 ? '#10b981' : entry.percentage >= 50 ? '#f59e0b' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
