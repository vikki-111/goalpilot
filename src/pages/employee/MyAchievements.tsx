import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function MyAchievements() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Achievements</h1>
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Achievements</CardTitle>
          <CardDescription>Track your progress against approved goals</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Achievement tracking will appear here when the quarter window is open.</p>
        </CardContent>
      </Card>
    </div>
  );
}
