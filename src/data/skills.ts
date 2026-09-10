import type { SkillGroup } from '@/types';

/**
 * Grouped exactly as the resume groups them. No proficiency percentages —
 * invented numbers are worse than no numbers, and the projects section already
 * shows where each technology was actually used.
 */
export const skillGroups: readonly SkillGroup[] = [
  {
    id: 'rpa',
    name: 'RPA & Automation',
    description: 'The core craft — building bots that survive contact with production.',
    skills: [
      'TruBot (Datamatics)',
      'Automation Edge',
      'UiPath (Basic)',
      'Intelligent Automation',
      'OCR',
      'Queues & Triggers',
      'RE Framework',
      'UI / Recorder-based Front-End Automation',
      'Workflow & Business Process Automation',
    ],
  },
  {
    id: 'programming',
    name: 'Programming & Scripting',
    description: 'Used where native RPA alone is not the right tool.',
    skills: ['SQL', 'PL/SQL', 'Python', 'VBA'],
  },
  {
    id: 'data',
    name: 'Databases & Cloud',
    description: 'Five database engines in daily use, plus secure file movement.',
    skills: [
      'Oracle',
      'MS SQL Server',
      'MySQL',
      'PostgreSQL',
      'Redshift',
      'Amazon S3',
      'SFTP / FTP',
    ],
  },
  {
    id: 'bi',
    name: 'Reporting & BI',
    description: 'Turning operational data into something a manager can act on.',
    skills: [
      'Power BI',
      'Advanced Excel',
      'Pivot Tables',
      'MIS & Dashboard Automation',
      'HTML Mail-Body / Mailer Automation',
    ],
  },
  {
    id: 'integrations',
    name: 'Integrations & Tools',
    description: 'Where automations meet the outside world.',
    skills: [
      'SMS API Integration',
      'WhatsApp API Integration',
      'AI-Assisted Development (ChatGPT, Claude)',
      'Git (Basic)',
    ],
  },
  {
    id: 'applications',
    name: 'Banking Applications & Platform',
    description: 'The systems the automations run against.',
    skills: ['LOS', 'LMS', 'CRM', 'ERP', 'Windows'],
  },
];

/** Flat, de-duplicated list used by search, filters and the AI skill tool. */
export const allSkills: readonly string[] = Array.from(
  new Set(skillGroups.flatMap((group) => group.skills)),
);
