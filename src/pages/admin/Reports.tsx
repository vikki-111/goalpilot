import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveCycle } from '@/hooks/useGoalSheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/checkins/ScoreBadge';
import { exportToXlsx, exportToCsv, generateReportFilename, generateCsvFilename } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText } from 'lucide-react';
import type { Quarter } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

interface ReportRow {
  [key: string]: string | number | null;
  employee: string;
  department: string;
  goalTitle: string;
  thrustArea: string;
  uomType: string;
  target: string;
  q1Actual: string;
  q2Actual: string;
  q3Actual: string;
  q4Actual: string;
  q1Score: number | null;
  q2Score: number | null;
  q3Score: number | null;
  q4Score: number | null;
}

export function Reports() {
  const { toast } = useToast();
  const { data: cycle } = useActiveCycle();
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterQuarter, setFilterQuarter] = useState<string>('all');
  const [searchName, setSearchName] = useState('');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['achievement-report', cycle?.id, filterDepartment, filterQuarter],
    queryFn: async () => {
      let query = supabase
        .from('goals')
        .select(`
          *,
          thrust_areas(name),
          goal_sheets!inner(
            status,
            employee_id,
            profiles!goal_sheets_employee_id_fkey(full_name, department)
          )
        `);

      if (filterDepartment !== 'all') {
        query = query.eq('goal_sheets.profiles.department', filterDepartment);
      }

      const { data: goalsData, error } = await query;
      if (error) throw error;

      const approvedGoals = (goalsData ?? []).filter((g: Record<string, unknown>) => {
        const gs = g.goal_sheets as Record<string, unknown> | null;
        return gs?.status === 'approved' || gs?.status === 'locked';
      });

      const allRows: ReportRow[] = [];

      for (const goal of approvedGoals) {
        const gs = goal.goal_sheets as Record<string, unknown> | null;
        const profiles = gs?.profiles as Record<string, unknown> | null;
        if (!profiles) continue;

        const ta = goal.thrust_areas as Record<string, unknown> | null;
        const targetDisplay = goal.uom_type === 'timeline'
          ? (goal.target_date?.toString() ?? '—')
          : goal.uom_type === 'zero'
            ? '0'
            : (goal.target_value?.toString() ?? '—');

        const row: ReportRow = {
          employee: profiles.full_name as string,
          department: (profiles.department as string) ?? '—',
          goalTitle: goal.title as string,
          thrustArea: (ta?.name as string) ?? '—',
          uomType: goal.uom_type as string,
          target: targetDisplay,
          q1Actual: '—', q2Actual: '—', q3Actual: '—', q4Actual: '—',
          q1Score: null, q2Score: null, q3Score: null, q4Score: null,
        };

        const { data: achievements } = await supabase
          .from('achievements')
          .select('*')
          .eq('goal_id', goal.id)
          .eq('cycle_id', cycle?.id ?? '');

        for (const ach of achievements ?? []) {
          const quarter = ach.quarter as Quarter;
          const actualDisplay = goal.uom_type === 'timeline'
            ? (ach.actual_date?.toString() ?? '—')
            : (ach.actual_value?.toString() ?? '—');

          const actualKey = `${quarter.toLowerCase()}Actual` as keyof ReportRow;
          const scoreKey = `${quarter.toLowerCase()}Score` as keyof ReportRow;
          (row as unknown as Record<string, unknown>)[actualKey] = actualDisplay;
          (row as unknown as Record<string, unknown>)[scoreKey] = ach.score;
        }

        allRows.push(row);
      }

      return allRows;
    },
    enabled: !!cycle,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('department')
        .not('department', 'is', null)
        .neq('role', 'admin');
      if (error) throw error;
      return [...new Set((data ?? []).map((d) => d.department))] as string[];
    },
  });

  const filteredData = reportData?.filter((row) => {
    if (filterQuarter !== 'all') {
      const scoreKey = `${filterQuarter.toLowerCase()}Score` as keyof ReportRow;
      if (row[scoreKey] === null) return false;
    }
    if (searchName && !row.employee.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  const handleExportXlsx = () => {
    if (!filteredData?.length) return;

    const columns = getReportColumns();
    const filename = generateReportFilename('achievement_report', cycle?.label ?? 'report');
    exportToXlsx(filteredData as unknown as Array<Record<string, unknown>>, columns, filename);
    toast({ title: 'Report exported', description: filename, variant: 'success' });
  };

  const handleExportCsv = () => {
    if (!filteredData?.length) return;

    const columns = getReportColumns();
    const filename = generateCsvFilename('achievement_report', cycle?.label ?? 'report');
    exportToCsv(filteredData as unknown as Array<Record<string, unknown>>, columns, filename);
    toast({ title: 'Report exported', description: filename, variant: 'success' });
  };

  const getReportColumns = () => [
    { header: 'Employee', key: 'employee' },
    { header: 'Department', key: 'department' },
    { header: 'Goal', key: 'goalTitle' },
    { header: 'Thrust Area', key: 'thrustArea' },
    { header: 'UoM', key: 'uomType' },
    { header: 'Target', key: 'target' },
    { header: 'Q1 Actual', key: 'q1Actual' },
    { header: 'Q2 Actual', key: 'q2Actual' },
    { header: 'Q3 Actual', key: 'q3Actual' },
    { header: 'Q4 Actual', key: 'q4Actual' },
    { header: 'Q1 Score', key: 'q1Score' },
    { header: 'Q2 Score', key: 'q2Score' },
    { header: 'Q3 Score', key: 'q3Score' },
    { header: 'Q4 Score', key: 'q4Score' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">View and export achievement data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={!filteredData?.length}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleExportXlsx} disabled={!filteredData?.length}>
            <Download className="mr-1 h-4 w-4" />
            Export XLSX
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Department</label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Quarter</label>
              <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All quarters</SelectItem>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Search Employee</label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Type to search..."
                className="w-48"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Achievement Report
          </CardTitle>
          <CardDescription>
            {filteredData?.length ?? 0} row(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredData?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No data matches the current filters.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Employee</TableHead>
                    <TableHead className="whitespace-nowrap">Department</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead className="whitespace-nowrap">Thrust Area</TableHead>
                    <TableHead className="whitespace-nowrap">UoM</TableHead>
                    <TableHead className="whitespace-nowrap">Target</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Q1</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Q2</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Q3</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Q4</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData?.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium whitespace-nowrap">{row.employee}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.department}</TableCell>
                      <TableCell className="max-w-56 truncate" title={row.goalTitle}>{row.goalTitle}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.thrustArea}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.uomType}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.target}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs">{row.q1Actual}</span>
                          <ScoreBadge score={row.q1Score} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs">{row.q2Actual}</span>
                          <ScoreBadge score={row.q2Score} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs">{row.q3Actual}</span>
                          <ScoreBadge score={row.q3Score} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs">{row.q4Actual}</span>
                          <ScoreBadge score={row.q4Score} size="sm" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
