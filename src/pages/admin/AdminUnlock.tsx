import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveCycle } from '@/hooks/useGoalSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import type { GoalSheet } from '@/types';

interface SheetWithDetails extends GoalSheet {
  employee_name: string;
  department: string;
  goal_count: number;
}

export function AdminUnlock() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cycle } = useActiveCycle();

  const { data: sheets, isLoading } = useQuery({
    queryKey: ['admin-locked-sheets', cycle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_sheets')
        .select(`
          *,
          profiles!goal_sheets_employee_id_fkey(full_name, department),
          goals(count)
        `)
        .eq('cycle_id', cycle?.id ?? '')
        .in('status', ['approved', 'locked'])
        .order('status', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((sheet: Record<string, unknown>) => ({
        id: sheet.id as string,
        employee_id: sheet.employee_id as string,
        cycle_id: sheet.cycle_id as string,
        status: sheet.status as string,
        submitted_at: sheet.submitted_at as string | null,
        approved_at: sheet.approved_at as string | null,
        approved_by: sheet.approved_by as string | null,
        manager_comment: sheet.manager_comment as string | null,
        locked_at: sheet.locked_at as string | null,
        created_at: sheet.created_at as string,
        employee_name: ((sheet.profiles as Record<string, unknown> | null)?.full_name as string) ?? '—',
        department: ((sheet.profiles as Record<string, unknown> | null)?.department as string) ?? '—',
        goal_count: ((sheet.goals as Array<Record<string, unknown>> | undefined)?.[0]?.count as number) ?? 0,
      })) as SheetWithDetails[];
    },
    enabled: !!cycle,
  });

  const unlockSheet = useMutation({
    mutationFn: async (sheetId: string) => {
      const { error } = await supabase
        .from('goal_sheets')
        .update({ status: 'approved', locked_at: null })
        .eq('id', sheetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locked-sheets'] });
      toast({ title: 'Goals unlocked', description: 'Employee can now edit their goals.', variant: 'success' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unlock Goals</h1>
        <p className="text-muted-foreground mt-1">Revert approved goal sheets to editable state</p>
      </div>

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Caution</p>
              <p className="text-sm text-amber-700 mt-1">
                Unlocking a goal sheet reverts it to &quot;approved&quot; status, allowing the employee to edit their goals.
                This action is logged in the audit trail.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Approved &amp; Locked Goal Sheets</CardTitle>
        </CardHeader>
        <CardContent>
          {sheets?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No approved or locked goal sheets.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Goals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved At</TableHead>
                  <TableHead>Locked At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets?.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">{sheet.employee_name}</TableCell>
                    <TableCell>{sheet.department}</TableCell>
                    <TableCell>{sheet.goal_count}</TableCell>
                    <TableCell>
                      <Badge variant={sheet.status === 'locked' ? 'success' : 'info'} className="text-xs capitalize">
                        {sheet.status === 'locked' ? <Lock className="mr-1 h-3 w-3" /> : null}
                        {sheet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {sheet.approved_at ? new Date(sheet.approved_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {sheet.locked_at ? new Date(sheet.locked_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Unlock goals for ${sheet.employee_name}? They will be able to edit their goal sheet.`)) {
                            unlockSheet.mutate(sheet.id);
                          }
                        }}
                        disabled={unlockSheet.isPending}
                      >
                        <Unlock className="mr-1 h-3 w-3" />
                        Unlock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
