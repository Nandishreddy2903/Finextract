
export interface LineItem {
  name: string;
  standardized_name: string;
  values: { [year: string]: number | null };
}

export interface FinancialData {
  company_name: string;
  currency: string | null;
  units: string | null;
  years: string[];
  line_items: LineItem[];
  missing_line_items: string[];
  completeness: "Complete" | "Partial" | "Not Found";
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
