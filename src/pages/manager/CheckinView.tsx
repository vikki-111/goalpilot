import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CheckinView() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Check-ins</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manager Check-ins</CardTitle>
          <CardDescription>Add comments and track progress for team members</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Check-in view will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
