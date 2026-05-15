import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Analytics() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QoQ Trend</CardTitle>
            <CardDescription>Quarter-over-quarter achievement trends</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chart will appear here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completion Heatmap</CardTitle>
            <CardDescription>Score distribution across employees and quarters</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Heatmap will appear here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Goal Distribution</CardTitle>
            <CardDescription>Goals by thrust area and UoM type</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Charts will appear here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manager Effectiveness</CardTitle>
            <CardDescription>Check-in completion rates by manager</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chart will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
