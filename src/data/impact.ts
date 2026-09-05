import type { ArchitectureFlow, ExpertisePillar, ImpactMetric } from '@/types';

/**
 * Every number here appears in the resume. Nothing is estimated, extrapolated
 * or rounded up. "Hundreds of operational hours a year" is a range in the
 * source document, so it is shown as text rather than as a fake precise count.
 */
export const impactMetrics: readonly ImpactMetric[] = [
  {
    id: 'automations',
    value: 80,
    prefix: '',
    suffix: '+',
    label: 'Production automations',
    detail: 'Built single-handedly across retail lending operations, reporting and compliance.',
  },
  {
    id: 'effort',
    value: 80,
    prefix: '',
    suffix: '%+',
    label: 'Manual effort reduced',
    detail: 'Across the processes automated at SBFC Finance Limited.',
  },
  {
    id: 'databases',
    value: 5,
    prefix: '',
    suffix: '',
    label: 'Database engines in daily use',
    detail: 'Oracle, MS SQL Server, MySQL, PostgreSQL and Redshift.',
  },
  {
    id: 'interns',
    value: 3,
    prefix: '',
    suffix: '',
    label: 'Interns mentored',
    detail: 'All three now contribute as independent RPA developers.',
  },
];

export const impactNarrative =
  'Hundreds of operational hours saved every year — the direct result of removing repetitive preparation, consolidation and reporting work from teams across the business.';

export const achievements: readonly string[] = [
  'Built 80+ enterprise automations independently across retail lending operations.',
  'Reduced manual effort by 80%+ and saved hundreds of operational hours annually.',
  'Trained 3 interns into productive, independent RPA developers.',
  'Progressed from IT Executive to on-role RPA Developer on the strength of delivery performance.',
];

export const expertisePillars: readonly ExpertisePillar[] = [
  {
    id: 'delivery',
    title: 'End-to-end delivery ownership',
    description:
      'Automation is not just the build. I run the whole cycle, which is why these bots stay alive in production.',
    points: [
      'Requirement discussions with business users',
      'BRD authoring and formal sign-off',
      'Development, testing and UAT',
      'Deployment and daily production support',
    ],
  },
  {
    id: 'engineering',
    title: 'Engineering beyond the RPA canvas',
    description:
      'When a drag-and-drop step is the wrong tool, I write the code — SQL, PL/SQL or Python — instead of forcing the platform.',
    points: [
      'SQL / PL-SQL developed and tuned across five engines',
      'Python for heavy calculations and report generation',
      'Queues, triggers and the RE Framework for resilient bot design',
      'Front-end automation where no back-end access exists',
    ],
  },
  {
    id: 'domain',
    title: 'Retail lending domain fluency',
    description:
      'I speak the language of the process owners — LOS, LMS, disbursement, delinquency — so requirements arrive intact.',
    points: [
      'Loan origination, servicing, disbursement and closure',
      'Collections, delinquency and NPA monitoring',
      'KYC / eKYC / eSign, Account Aggregator, loan documentation',
      'Banking operations and compliance workflows',
    ],
  },
  {
    id: 'reliability',
    title: 'Production reliability',
    description:
      'A bot that fails quietly is worse than no bot. Mine are monitored, and failures are diagnosed at the root.',
    points: [
      'Daily monitoring of production bots',
      'Root-cause and log analysis on incidents',
      'Exception handling and retry logic by design',
      'Secure movement and archival via Amazon S3 and SFTP/FTP',
    ],
  },
];

/**
 * Architecture flows. `verified: true` means the flow describes systems the
 * resume states were actually built. Anything conceptual is labelled
 * "Illustrative" in the UI and marked verified: false here.
 */
export const architectureFlows: readonly ArchitectureFlow[] = [
  {
    id: 'delivery-lifecycle',
    name: 'Delivery lifecycle',
    verified: true,
    caption:
      'The cycle owned end to end for every automation, per the resume — requirement through to production support.',
    steps: [
      {
        id: 'requirement',
        label: 'Requirement discussion',
        detail: 'Sit with the business users who own the process and understand it before designing anything.',
      },
      {
        id: 'brd',
        label: 'BRD & sign-off',
        detail: 'Write the business requirement document and get formal agreement on scope.',
      },
      {
        id: 'development',
        label: 'Development',
        detail: 'Build in TruBot / Automation Edge, with SQL, PL/SQL and Python where they fit better.',
      },
      {
        id: 'testing',
        label: 'Testing & UAT',
        detail: 'Test the happy path and the exceptions, then run user acceptance testing with the business.',
      },
      {
        id: 'deployment',
        label: 'Deployment',
        detail: 'Release the bot into the production schedule with its triggers and queues.',
      },
      {
        id: 'support',
        label: 'Production support',
        detail: 'Daily monitoring, log and root-cause analysis, exception handling and retry logic.',
      },
    ],
  },
  {
    id: 'automation-runtime',
    name: 'Automation runtime',
    verified: true,
    caption:
      'How a scheduled bot actually executes — the pattern behind the MIS, compliance and mailer automations.',
    steps: [
      {
        id: 'trigger',
        label: 'Trigger / schedule',
        detail: 'Time-based schedule or queue trigger starts the run.',
      },
      {
        id: 'extract',
        label: 'Data extraction',
        detail: 'SQL / PL-SQL against Oracle, MS SQL, MySQL, PostgreSQL or Redshift; front-end automation where there is no back-end.',
      },
      {
        id: 'process',
        label: 'Processing',
        detail: 'Excel workflows, pivots and multi-step calculations; Python where the computation is heavy.',
      },
      {
        id: 'validate',
        label: 'Validation & exceptions',
        detail: 'Rules evaluated, exceptions raised, retry logic applied instead of failing silently.',
      },
      {
        id: 'deliver',
        label: 'Delivery',
        detail: 'HTML mail-body dashboards, Power BI refreshes, and secure archival via Amazon S3 / SFTP.',
      },
      {
        id: 'notify',
        label: 'Notification',
        detail: 'Stakeholders and customers reached over email, SMS and WhatsApp APIs — timely and auditable.',
      },
    ],
  },
];
