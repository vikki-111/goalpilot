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

export function generateReportFilename(prefix: string, suffix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${suffix}_${timestamp}.xlsx`;
}
