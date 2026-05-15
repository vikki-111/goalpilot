import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { GoalSheet, Profile } from '@/types';

interface SheetWithProfile extends GoalSheet {
  profiles: Pick<Profile, 'full_name' | 'department' | 'email'>;
  goals: Array<{ count: number }>;
}

export function ApprovalQueue() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: sheets, isLoading } = useQuery({
    queryKey: ['approval-queue', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_sheets')
        .select(`
          *,
          profiles!goal_sheets_employee_id_fkey(full_name, department, email),
          goals(count)
        `)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SheetWithProfile[];
    },
    enabled: !!profile,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground mt-1">Review and approve goal sheets from your team</p>
      </div>

      {sheets?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No pending approvals</h3>
            <p className="text-muted-foreground text-sm mt-1">
              All goal sheets have been reviewed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sheets?.map((sheet) => {
            const initials = sheet.profiles.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();
            const submittedDate = sheet.submitted_at
              ? new Date(sheet.submitted_at).toLocaleDateString()
              : '—';

            return (
              <Card key={sheet.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{sheet.profiles.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sheet.profiles.department} &middot; {sheet.profiles.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {sheet.goals?.[0]?.count ?? 0} goals
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Submitted {submittedDate}
                      </span>
                    </div>
                    <Badge variant="info">Submitted</Badge>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/manager/approvals/${sheet.id}`)}
                    >
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
