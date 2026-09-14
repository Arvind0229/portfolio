import type { EducationItem, Profile } from '@/types';
import { activeResume } from '@/data/resume-registry';

/**
 * Source of truth: Arvind Gupta — RPA Developer resume.
 * Nothing in this file may be added that is not supported by that document.
 * Wording is edited for the web; facts, employers, dates and numbers are not.
 *
 * One figure is more precise than the resume: the years of experience. The
 * resume says "2+ years", which was written at a point in time and has been
 * true for a while; Arvind states it is **2.9 years**, and he is the authority
 * on his own tenure. Stated exactly rather than rounded to "3 years" — a
 * rounded figure a reader can check against the dates below and find wrong is
 * worse than a precise one.
 */
export const profile: Profile = {
  name: 'Arvind Gupta',
  shortName: 'Arvind',
  title: 'RPA Developer',
  positioning:
    'I automate high-volume banking, NBFC and retail lending processes — end to end, from the requirement conversation to the bot running in production.',
  // The page speaks in Arvind's voice; the assistant speaks about him. Same
  // facts, two voices — `summaryThirdPerson` and `positioningThirdPerson` are
  // what the AI knowledge layer quotes, so an answer never says "I started as
  // an IT Executive" over an assistant byline. A data-integrity test asserts
  // both carry the same anchor facts and no first-person pronouns.
  summary:
    'RPA Developer with 2.9 years of experience automating high-volume business processes across the Banking, NBFC and Retail Lending space at SBFC Finance Limited. I started as an IT Executive and was absorbed on-role as an RPA Developer on the strength of delivery performance. I have built 80+ production automations independently across LOS, LMS and reporting/operations workflows using TruBot (Datamatics), with recent hands-on in Automation Edge and working knowledge of UiPath. I own the full delivery cycle — requirement discussions, BRD authoring, development, testing, UAT, deployment and production support — and work daily with SQL/PL-SQL, Python, multi-database integration, Power BI and Excel/MIS automation, plus API-based compliance automation. I currently mentor 3 interns who now work as independent RPA developers.',
  summaryThirdPerson:
    'Arvind is an RPA Developer with 2.9 years of experience automating high-volume business processes across the Banking, NBFC and Retail Lending space at SBFC Finance Limited. He started as an IT Executive and was absorbed on-role as an RPA Developer on the strength of delivery performance. He has built 80+ production automations independently across LOS, LMS and reporting/operations workflows using TruBot (Datamatics), with recent hands-on in Automation Edge and working knowledge of UiPath. He owns the full delivery cycle — requirement discussions, BRD authoring, development, testing, UAT, deployment and production support — and works daily with SQL/PL-SQL, Python, multi-database integration, Power BI and Excel/MIS automation, plus API-based compliance automation. He currently mentors 3 interns who now work as independent RPA developers.',
  positioningThirdPerson:
    'He automates high-volume banking, NBFC and retail lending processes end to end, from the requirement conversation to the bot running in production.',
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
  // The portrait. One entry, read by every component that shows his face, so
  // a new photograph is a one-line change rather than a hunt through JSX.
  // The file is a 4:5 crop of the studio headshot he supplied, re-encoded from
  // a 1.9 MB PNG to a 167 KB progressive JPEG — a photograph stored as PNG is
  // many times the bytes for no visible gain, and `next/image` negotiates
  // AVIF/WebP from this source per request.
  photo: {
    src: '/profile/arvind-gupta.jpg',
    width: 1081,
    height: 1351,
    alt: 'Arvind Gupta',
    blurDataURL:
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPAAwDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDLs7GG9gd3Y5HA2tjFZUqbJGXOcHGfWtfw4Fmnmgfum4fUVjSHLt9aSTTKbTR//9k=',
    // The face centres at about 41% of the source height; this is the
    // `object-position` that keeps it centred when the crop goes square.
    facePosition: '50% 8%',
  },

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
    {
      id: 'linkedin',
      label: 'LinkedIn',
      // Stored without the share tracking parameters it was copied with
      // (`utm_source`, `utm_content`, `utm_medium`). Those describe how the
      // link was shared once, not where the profile lives, and shipping them
      // on a public page hands the analytics to whoever reads it.
      href: 'https://www.linkedin.com/in/arvind-gupta-774996216',
      handle: 'in/arvind-gupta-774996216',
    },
  ],
  /*
   * Read from the registry, not written here.
   *
   * These three values used to be literals, and the admin upload wrote to a
   * different path entirely — so replacing the resume changed nothing a visitor
   * could see. The fix is not a corrected string: it is that there is now one
   * place that answers "which file is the resume", and both the uploader and
   * the download buttons read it.
   *
   * The shape is unchanged, deliberately. Every consumer of `profile.resume`
   * — the resume section, the hero, the footer — keeps working untouched.
   */
  resume: resolveResume(),
};

function resolveResume(): Profile['resume'] {
  const current = activeResume();
  if (current) {
    return {
      pdf: current.pdf,
      ...(current.docx ? { docx: current.docx } : {}),
      fileLabel: current.label,
    };
  }

  /*
   * No active version. This is reachable only if the registry is emptied or
   * corrupted, and the honest answer is an empty path rather than a stale
   * literal that pretends a file is there. The resume section renders an
   * unavailable state from this; see the empty-state handling there.
   */
  return { pdf: '', fileLabel: 'Résumé' };
}

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
