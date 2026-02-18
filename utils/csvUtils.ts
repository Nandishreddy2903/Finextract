
import { FinancialData } from "../types";

/**
 * Converts a single financial dataset into a WIDE (tabular) CSV.
 * Format: Line Item (Original), Standardized Name, Year1, Year2, ...
 */
export function convertToWideCSV(data: FinancialData): string {
  if (!data.line_items || data.line_items.length === 0) return "";

  const headers = ["Line Item (Original)", "Standardized Name", ...data.years];
  
  const rows = data.line_items.map(item => {
    const periodValues = data.years.map(year => {
      const val = item.values[year];
      if (val === null || val === undefined) return "";
      return val.toString().replace(/,/g, '');
    });
    return [item.name, item.standardized_name, ...periodValues];
  });

  return [headers, ...rows]
    .map(row => 
      row.map(cell => {
        const cellStr = cell.toString();
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ).join("\n");
}

/**
 * Converts multiple financial datasets into a LONG (database-ready) CSV.
 * Format: Source Company, Line Item (Original), Standardized Name, Period, Value
 */
export function convertToLongCSV(dataList: FinancialData[]): string {
  if (dataList.length === 0) return "";

  const headers = ["Source / Company", "Line Item (Original)", "Standardized Name", "Period", "Value"];
  const rows: string[][] = [];

  dataList.forEach(data => {
    data.line_items.forEach(item => {
      data.years.forEach(year => {
        const val = item.values[year];
        const displayVal = (val === null || val === undefined) ? "" : val.toString().replace(/,/g, '');
        
        rows.push([
          data.company_name,
          item.name,
          item.standardized_name,
          year,
          displayVal
        ]);
      });
    });
  });

  return [headers, ...rows]
    .map(row => 
      row.map(cell => {
        const cellStr = cell.toString();
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ).join("\n");
}

export function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
