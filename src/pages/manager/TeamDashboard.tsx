import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function TeamDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Team Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>View your team's goals and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Team dashboard will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
