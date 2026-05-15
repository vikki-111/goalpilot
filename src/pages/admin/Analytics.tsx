import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QoQTrendChart, CompletionHeatmap, GoalDistributionChart, ManagerEffectivenessChart } from '@/components/analytics/AnalyticsCharts';
import { TrendingUp, Grid3X3, PieChart, BarChart3 } from 'lucide-react';

export function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Insights and trends across the organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            QoQ Achievement Trend
          </CardTitle>
          <CardDescription>Average score by department across quarters</CardDescription>
        </CardHeader>
        <CardContent>
          <QoQTrendChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Completion Heatmap
          </CardTitle>
          <CardDescription>Average scores by employee and quarter</CardDescription>
        </CardHeader>
        <CardContent>
          <CompletionHeatmap />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Goal Distribution
          </CardTitle>
          <CardDescription>Goals by thrust area and UoM type</CardDescription>
        </CardHeader>
        <CardContent>
          <GoalDistributionChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Manager Effectiveness
          </CardTitle>
          <CardDescription>Check-in completion rates by manager</CardDescription>
        </CardHeader>
        <CardContent>
          <ManagerEffectivenessChart />
        </CardContent>
      </Card>
    </div>
  );
}
