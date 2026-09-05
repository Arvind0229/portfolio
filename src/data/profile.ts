import type { EducationItem, Profile } from '@/types';

/**
 * Source of truth: Arvind Gupta — RPA Developer resume.
 * Nothing in this file may be added that is not supported by that document.
 * Wording is edited for the web; facts, employers, dates and numbers are not.
 */
export const profile: Profile = {
  name: 'Arvind Gupta',
  shortName: 'Arvind',
  title: 'RPA Developer',
  positioning:
    'I automate high-volume banking, NBFC and retail lending processes — end to end, from the requirement conversation to the bot running in production.',
  summary:
    'RPA Developer with 2+ years of experience automating high-volume business processes across the Banking, NBFC and Retail Lending space at SBFC Finance Limited. I started as an IT Executive and was absorbed on-role as an RPA Developer on the strength of delivery performance. I have built 80+ production automations independently across LOS, LMS and reporting/operations workflows using TruBot (Datamatics), with recent hands-on in Automation Edge and working knowledge of UiPath. I own the full delivery cycle — requirement discussions, BRD authoring, development, testing, UAT, deployment and production support — and work daily with SQL/PL-SQL, Python, multi-database integration, Power BI and Excel/MIS automation, plus API-based compliance automation. I currently mentor 3 interns who now work as independent RPA developers.',
  location: 'Mumbai, India — 400101',
  email: 'guptaarvind29042000@gmail.com',
  phone: '+91 82913 98844',
  availability: 'Open to larger automation and process-transformation challenges',
  focusAreas: [
    'Robotic Process Automation',
    'Retail Lending · LOS & LMS',
    'SQL / PL-SQL across 5 databases',
    'Python automation & reporting',
    'Power BI & MIS dashboards',
    'API-based compliance automation',
  ],
  // Only channels present in the resume are listed. Add profiles here when
  // they exist — every component reads this array, nothing is hard-coded.
  socials: [
    {
      id: 'email',
      label: 'Email',
      href: 'mailto:guptaarvind29042000@gmail.com',
      handle: 'guptaarvind29042000@gmail.com',
    },
    {
      id: 'phone',
      label: 'Phone',
      href: 'tel:+918291398844',
      handle: '+91 82913 98844',
    },
  ],
  resume: {
    pdf: '/resume/Arvind-Gupta-RPA-Developer.pdf',
    docx: '/resume/Arvind-Gupta-RPA-Developer.docx',
    fileLabel: 'Arvind Gupta — RPA Developer',
  },
};

export const education: readonly EducationItem[] = [
  {
    id: 'bsc-it',
    qualification: "Bachelor's Degree, Information Technology",
    institution: 'Ghanshyam Das Saraf College, Mumbai',
    period: '2018 – 2021',
  },
  {
    id: 'hsc',
    qualification: 'HSC (Science)',
    institution: 'Durgadevi Saraf College, Mumbai',
    period: '2018',
  },
  {
    id: 'ssc',
    qualification: 'SSC',
    institution: 'Our Lady of Remedy High School, Mumbai',
    period: '2016',
  },
];

export const domainKnowledge: readonly string[] = [
  'Loan Origination',
  'Loan Servicing',
  'Disbursement & Closure',
  'EMI Management',
  'Customer Onboarding & Lifecycle',
  'Collections',
  'Delinquency & NPA Monitoring',
  'Retail Lending',
  'Gold / Mortgage / Business Loans',
  'Loan Against Property (LAP)',
  'Foreclosure',
  'KYC / eKYC / eSign',
  'Account Aggregator',
  'Loan Documentation',
  'Banking Operations & Compliance',
];
