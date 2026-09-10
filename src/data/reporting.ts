/**
 * Sample data for the automated-reporting showcase.
 *
 * IMPORTANT — every value in this file is invented.
 *
 * The resume states that MIS reports are delivered as "formatted HTML
 * mail-body dashboards", and that compliance exceptions are alerted in real
 * time. That is a real, demonstrable craft, and showing it is worth a page.
 * What must never appear on a public site is the content of those reports:
 * employee names, official email addresses, PAN and mobile numbers, insider-
 * trading designated-person lists, branch-level portfolio figures or live
 * validation exception counts. That is third-party PII and regulated internal
 * data belonging to an NBFC.
 *
 * So this file carries the *shape* of those reports with placeholder regions,
 * placeholder counts and no employer-identifying content, and the UI labels
 * every panel as illustrative. It demonstrates the capability without
 * disclosing anything.
 */

export interface SampleKpi {
  id: string;
  label: string;
  value: string;
  caption: string;
  tone: 'neutral' | 'positive' | 'attention' | 'accent';
}

export interface SampleRow {
  region: string;
  completed: number;
  pending: number;
  total: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  cadence: string;
  purpose: string;
  /** Which resume-backed capability this template demonstrates. */
  builtWith: readonly string[];
}

export const reportTemplates: readonly ReportTemplate[] = [
  {
    id: 'completion-summary',
    name: 'Completion summary mailer',
    cadence: 'Daily, scheduled',
    purpose:
      'A single mail-body dashboard showing progress against a target, with the leading and lagging groups called out so nobody has to read the table to find the problem.',
    builtWith: ['TruBot (Datamatics)', 'SQL', 'Advanced Excel', 'HTML Mail-Body Automation'],
  },
  {
    id: 'validation-report',
    name: 'Validation & exception report',
    cadence: 'Daily, plus on-exception',
    purpose:
      'A pass/fail control report over a reconciliation. When a check breaches, the bot raises it in real time to the team that owns it rather than waiting for the next review.',
    builtWith: ['TruBot (Datamatics)', 'SQL', 'SMS API', 'WhatsApp API'],
  },
  {
    id: 'health-check',
    name: 'Application health check',
    cadence: 'Daily monitoring',
    purpose:
      'A consolidated view of every configured validation for an application, scored, so governance review starts from a number rather than a spreadsheet.',
    builtWith: ['TruBot (Datamatics)', 'PL/SQL', 'Power BI', 'Mailer Automation'],
  },
];

/** Illustrative only — invented figures, placeholder regions. */
export const sampleKpis: readonly SampleKpi[] = [
  { id: 'records', label: 'Records in scope', value: '3,097', caption: 'Across all regions', tone: 'neutral' },
  { id: 'completed', label: 'Completed', value: '2,932', caption: 'Confirmed', tone: 'positive' },
  { id: 'pending', label: 'Pending', value: '165', caption: 'Still open', tone: 'attention' },
  { id: 'rate', label: 'Completion', value: '94.7%', caption: 'Completed vs total', tone: 'accent' },
];

export const sampleRows: readonly SampleRow[] = [
  { region: 'Region A', completed: 68, pending: 0, total: 68 },
  { region: 'Region B', completed: 291, pending: 17, total: 308 },
  { region: 'Region C', completed: 4, pending: 2, total: 6 },
  { region: 'Region D', completed: 11, pending: 0, total: 11 },
  { region: 'Region E', completed: 64, pending: 1, total: 65 },
];

export const sampleValidationFlow: readonly string[] = [
  'Source extract',
  'Master table',
  'Validation engine',
  'Records matched',
  'Report generated',
];
