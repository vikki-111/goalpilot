import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function Dashboard() {
  const { profile } = useAuth();

  const roleGreeting: Record<string, string> = {
    employee: 'My Workspace',
    manager: 'Manager Dashboard',
    admin: 'Admin Console',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-muted-foreground mt-1">
          {roleGreeting[profile?.role || 'employee']}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quick Overview</CardTitle>
          <CardDescription>Your goal tracking summary will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Navigate using the sidebar to access your goals, achievements, and reports.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
