import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
}

export function exportToXlsx(data: Array<Record<string, unknown>>, columns: ExportColumn[], filename: string) {
  const rows = data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col.header] = row[col.key] ?? '';
    }
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  const colWidths = columns.map((col) => ({
    wch: Math.max(col.header.length, 15),
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, filename);
}

export function exportToCsv(data: Array<Record<string, unknown>>, columns: ExportColumn[], filename: string) {
  const header = columns.map((col) => escapeCsvValue(col.header)).join(',');

  const rows = data.map((row) =>
    columns.map((col) => escapeCsvValue(row[col.key])).join(',')
  );

  const csvContent = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function generateCsvFilename(prefix: string, suffix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${suffix}_${timestamp}.csv`;
}

export function generateReportFilename(prefix: string, suffix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${suffix}_${timestamp}.xlsx`;
}
