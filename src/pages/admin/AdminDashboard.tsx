import { useMemo } from 'react';
import { useActiveCycle } from '@/hooks/useGoalSheet';
import { useOrgStats, useCheckinCompletion, useRecentAuditEvents, useDepartmentSummary } from '@/hooks/useAdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getActiveWindow, getQuarterLabel } from '@/lib/cycle';
import { FileText, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Quarter } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return '1 day ago';
  return `${diffDays}d ago`;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();
  const { data: orgStats, isLoading: statsLoading } = useOrgStats(cycle?.id ?? '');
  const activeWindow = cycle ? getActiveWindow(cycle) : 'none';
  const currentQuarter = QUARTERS.find((q) => q === activeWindow) ?? 'Q1';
  const { data: checkinCompletion, isLoading: checkinLoading } = useCheckinCompletion(
    cycle?.id ?? '',
    currentQuarter
  );
  const { data: auditEvents, isLoading: auditLoading } = useRecentAuditEvents(5);
  const { data: deptSummary, isLoading: deptLoading } = useDepartmentSummary(
    cycle?.id ?? '',
    currentQuarter
  );

  const nextWindowInfo = useMemo(() => {
    if (!cycle) return null;
    if (activeWindow === 'goal_setting') return { label: 'Q1', date: new Date(cycle.q1_opens) };
    if (activeWindow === 'Q1') return { label: 'Q2', date: new Date(cycle.q2_opens) };
    if (activeWindow === 'Q2') return { label: 'Q3', date: new Date(cycle.q3_opens) };
    if (activeWindow === 'Q3') return { label: 'Q4', date: new Date(cycle.q4_opens) };
    return null;
  }, [cycle, activeWindow]);

  const windowLabels: Record<string, string> = {
    goal_setting: 'Goal Setting',
    Q1: 'Q1',
    Q2: 'Q2',
    Q3: 'Q3',
    Q4: 'Q4',
    none: 'None',
  };

  if (cycleLoading || statsLoading || checkinLoading || auditLoading || deptLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground mt-1">{cycle?.label ?? 'No active cycle'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orgStats?.total_employees ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orgStats?.goals_submitted ?? 0}</div>
            <p className="text-xs text-muted-foreground">Goals Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{orgStats?.goals_approved ?? 0}</div>
            <p className="text-xs text-muted-foreground">Goals Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${orgStats?.goals_pending === 0 ? 'text-green-600' : 'text-amber-600'}`}>{orgStats?.goals_pending ?? 0}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Cycle</CardTitle>
              <Badge variant="outline">{windowLabels[activeWindow]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-semibold">{cycle?.label}</p>
              <p className="text-sm text-muted-foreground">
                Current window: {windowLabels[activeWindow]}
              </p>
            </div>
            {nextWindowInfo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {nextWindowInfo.label} opens {nextWindowInfo.date.toLocaleDateString()}
              </div>
            )}
            <Button variant="outline" onClick={() => navigate('/admin/cycles')} className="w-full">
              Manage Cycles <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Check-in Completion — {getQuarterLabel(currentQuarter)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-2">
              <span className="text-4xl font-bold">
                {checkinCompletion?.completion_pct ?? 0}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {checkinCompletion?.submitted_count ?? 0} of {checkinCompletion?.total_employees ?? 0} employees
              </p>
            </div>
            <Progress value={checkinCompletion?.completion_pct ?? 0} className="h-2 [&>div]:bg-amber-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Audit Events</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/audit')}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {auditEvents && auditEvents.length > 0 ? (
              <div className="space-y-3">
                {auditEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{event.actor_name ?? 'System'}</span>
                        {' '}{event.action}{' '}
                        <span className="text-muted-foreground">{event.entity_type}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No audit events yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Department Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Emps</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>CI%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptSummary?.map((dept) => (
                  <TableRow key={dept.department}>
                    <TableCell className="font-medium">{dept.department}</TableCell>
                    <TableCell>{dept.employee_count}</TableCell>
                    <TableCell>
                      {dept.avg_score !== null ? (
                        <span className={`font-medium ${
                          dept.avg_score < 50 ? 'text-red-600' :
                          dept.avg_score < 80 ? 'text-amber-600' :
                          dept.avg_score < 100 ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {dept.avg_score}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={dept.checkin_pct} className="h-2 w-16" />
                        <span className="text-sm">{dept.checkin_pct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
