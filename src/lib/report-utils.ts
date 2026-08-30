// src/lib/report-utils.ts

export interface CsvColumn {
  key: string;
  header: string;
  transform?: (value: unknown) => string;
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function generateCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        let value: string;
        if (col.transform) {
          value = col.transform(raw);
        } else if (raw === null || raw === undefined) {
          value = "";
        } else if (typeof raw === "number") {
          value = raw.toString();
        } else if (raw instanceof Date) {
          value = raw.toLocaleDateString("en-GB");
        } else {
          value = String(raw);
        }
        return escapeCsvField(value);
      })
      .join(",")
  );
  return [header, ...body].join("\r\n");
}

export function downloadCsv(csvContent: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportFilename(reportType: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${reportType}-report-${date}.csv`;
}

export async function exportReportToCsv(
  reportType: string,
  columns: CsvColumn[],
  rows: Record<string, unknown>[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const csv = generateCsv(columns, rows);
    const filename = getExportFilename(reportType);
    downloadCsv(csv, filename);

    // Audit log
    const { logAudit } = await import("@/lib/offline/audit-repository");
    await logAudit({
      userId,
      action: "REPORT_EXPORTED",
      entityType: "report",
      metadata: {
        reportType,
        rowCount: rows.length,
      },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Export failed" };
  }
}