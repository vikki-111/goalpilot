import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle } from '@/hooks/useGoalSheet';
import { useTeamSheets, useTeamAchievementSummary } from '@/hooks/useTeamDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getActiveWindow, getQuarterLabel } from '@/lib/cycle';
import { Users, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Quarter } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  returned: 'bg-amber-100 text-amber-700',
  locked: 'bg-green-100 text-green-700',
};

export function TeamDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();
  const { data: sheets, isLoading: sheetsLoading } = useTeamSheets(
    profile?.id ?? '',
    cycle?.id ?? ''
  );

  const activeWindow = cycle ? getActiveWindow(cycle) : 'none';
  const currentQuarter = QUARTERS.find((q) => q === activeWindow) ?? 'Q1';
  const { data: achievementSummary, isLoading: achLoading } = useTeamAchievementSummary(
    profile?.id ?? '',
    cycle?.id ?? '',
    currentQuarter
  );

  const pendingApprovals = useMemo(() => {
    return (sheets ?? []).filter((s) => s.status === 'submitted');
  }, [sheets]);

  const sortedByScore = useMemo(() => {
    return [...(achievementSummary ?? [])].sort((a, b) => {
      if (a.avg_score === null && b.avg_score === null) return 0;
      if (a.avg_score === null) return 1;
      if (b.avg_score === null) return -1;
      return a.avg_score - b.avg_score;
    });
  }, [achievementSummary]);

  if (cycleLoading || sheetsLoading || achLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
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
        <h1 className="text-3xl font-bold tracking-tight">Team Overview</h1>
        <p className="text-muted-foreground mt-1">
          {profile?.full_name} &middot; {cycle?.label ?? 'No active cycle'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="text-xs">{pendingApprovals.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map((sheet) => (
                  <div key={sheet.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{sheet.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground">{sheet.profiles.department}</p>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/manager/approvals/${sheet.id}`)}>
                      Review <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {getQuarterLabel(currentQuarter)} Check-in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Employees updated</span>
              <span className="font-medium">
                {achievementSummary?.length ? achievementSummary.filter((a) => a.achievements_submitted > 0).length : 0} / {achievementSummary?.length ?? 0}
              </span>
            </div>
            <Progress
              value={achievementSummary?.length ? (achievementSummary.filter((a) => a.achievements_submitted > 0).length / achievementSummary.length) * 100 : 0}
              className="h-2"
            />

            {achievementSummary?.some((a) => a.achievements_submitted === 0) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Not yet submitted:</p>
                {achievementSummary
                  .filter((a) => a.achievements_submitted === 0)
                  .map((a) => (
                    <div key={a.employee_id} className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span>{a.full_name}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Goal Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Goals</TableHead>
                  <TableHead>Weightage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets?.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">{sheet.profiles.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{sheet.profiles.department}</TableCell>
                    <TableCell>{sheet.goal_count}</TableCell>
                    <TableCell>
                      <span className={sheet.total_weightage === 100 ? 'text-green-600' : 'text-red-600'}>
                        {sheet.total_weightage}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[sheet.status]}>
                        {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/manager/approvals/${sheet.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Scores — {getQuarterLabel(currentQuarter)}</CardTitle>
            <p className="text-xs text-muted-foreground">Sorted lowest to highest</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedByScore.length > 0 ? (
              sortedByScore.map((emp) => (
                <div key={emp.employee_id} className="flex items-center gap-4">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium truncate">{emp.full_name}</p>
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={emp.avg_score ?? 0}
                      className="h-2"
                    />
                  </div>
                  <div className="w-16 text-right">
                    {emp.avg_score !== null ? (
                      <span className={`text-sm font-medium ${
                        emp.avg_score < 50 ? 'text-red-600' :
                        emp.avg_score < 80 ? 'text-amber-600' :
                        emp.avg_score < 100 ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {emp.avg_score}%
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No achievement data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
