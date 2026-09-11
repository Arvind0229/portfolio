import type {
  AssistantModeDefinition,
  FontSetDefinition,
  NavItem,
  ThemeDefinition,
} from '@/types';

const getSiteUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return envUrl.startsWith('http://') || envUrl.startsWith('https://')
      ? envUrl
      : `https://${envUrl}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')
      ? vercelUrl
      : `https://${vercelUrl}`;
  }

  return 'https://arvindsportfolio.vercel.app';
};

export const siteConfig = {
  name: 'Arvind Gupta — RPA Developer',
  shortName: 'Arvind Gupta',
  description:
    'RPA Developer automating banking, NBFC and retail lending operations. 80+ production automations built end to end with TruBot, SQL/PL-SQL, Python and Power BI — with a grounded AI assistant that answers questions about the work.',
  /** Overridden at build time by NEXT_PUBLIC_SITE_URL or VERCEL_URL when deployed. */
  url: getSiteUrl(),
  locale: 'en_IN',
} as const;

/**
 * Routes.
 *
 * The site is a set of pages rather than one long scroll: each area of the
 * profile gets a URL that can be linked, shared and landed on directly, which
 * is what a recruiter forwarding "his projects" actually needs.
 */
/**
 * The primary bar — seven anchors into the one-page scroll.
 *
 * Two changes, and the second is the reason for the first.
 *
 * **Ten items became seven.** The old bar had four entries answering one
 * question — About, Expertise, Impact and Technology stack all say "here is
 * what he can do" — and two more (Education, Resume) that resolved to a
 * three-row list and a pair of download buttons. A recruiter scanning for
 * thirty seconds does not audit ten labels; they pick the two that look
 * obvious and leave.
 *
 * **Routes became anchors.** Giving each area its own page meant that
 * finishing one did nothing: you had to come back to the bar, choose the next
 * label, and click. A visitor who wants the whole story had to ask for it
 * seven times. Now scrolling moves through the profile in reading order and
 * the bar highlights where you are; clicking is for jumping, not for
 * advancing.
 *
 * These `href`s are anchors, so they are **not** what the sitemap is built
 * from — see `sitemapRoutes` below. Each `id` must match an element id on the
 * home page; a test asserts that.
 */
export const navigation: readonly NavItem[] = [
  { id: 'top', label: 'Home', href: '/#top' },
  { id: 'about', label: 'About', href: '/#about' },
  { id: 'experience', label: 'Experience', href: '/#experience' },
  { id: 'projects', label: 'Projects', href: '/#projects' },
  { id: 'skills', label: 'Skills', href: '/#skills' },
  { id: 'impact', label: 'Impact', href: '/#impact' },
  { id: 'contact', label: 'Contact', href: '/#contact' },
];

/**
 * Real pages that are deliberately outside the scroll.
 *
 * The assistant is a conversation rather than a section — a chat box dropped
 * mid-page invites people to type into it while scrolling past. The
 * architecture demonstration runs on a timer and deserves the viewport to
 * itself. Both are reached from the footer, from the cards at the foot of the
 * home page, and — for the assistant — from the header button.
 */
export const secondaryNavigation: readonly NavItem[] = [
  { id: 'architecture', label: 'Architecture', href: '/architecture' },
  { id: 'assistant', label: 'AI assistant', href: '/assistant' },
];

/**
 * What the sitemap is built from: URLs a crawler can actually fetch.
 *
 * `navigation` cannot be used for this any more. `/#projects` is the same URL
 * as `/` to a crawler, and listing one document seven times under seven
 * fragments is the kind of thing that quietly costs a site its indexing.
 */
export const sitemapRoutes: readonly string[] = [
  '/',
  ...secondaryNavigation.map((item) => item.href),
];

export const themes: readonly ThemeDefinition[] = [
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Restrained, executive, highly readable',
    defaultMode: 'light',
    swatch: ['#1D4ED8', '#0F766E'],
  },
  {
    id: 'engineering',
    name: 'Midnight',
    tagline: 'Midnight blue, electric accents, control-room dark',
    defaultMode: 'dark',
    swatch: ['#3B82F6', '#06B6D4'],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Editorial, typographic, expressive',
    defaultMode: 'light',
    swatch: ['#D9451F', '#1F5F5B'],
  },
];

export const fontSets: readonly FontSetDefinition[] = [
  {
    id: 'precision',
    name: 'Precision',
    description: 'Space Grotesk display over Inter — the signature pairing.',
    preview: 'Aa — 80+ automations',
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'JetBrains Mono headings over Inter body — engineering-first.',
    preview: 'Aa — 80+ automations',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Fraunces display over Sora body — expressive and magazine-like.',
    preview: 'Aa — 80+ automations',
  },
];

export const assistantModes: readonly AssistantModeDefinition[] = [
  {
    id: 'recruiter',
    label: 'Recruiter',
    description: 'Fit, experience, responsibilities and achievements.',
    hint: 'Answers focus on role fit, experience and achievements.',
  },
  {
    id: 'technical',
    label: 'Technical',
    description: 'Technologies, implementation and automation architecture.',
    hint: 'Answers focus on tooling, implementation detail and architecture.',
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Plain-language explanations of what the work achieved.',
    hint: 'Answers avoid jargon and lead with business outcomes.',
  },
  {
    id: 'general',
    label: 'General',
    description: 'Straightforward questions about the profile.',
    hint: 'Balanced answers about the profile as a whole.',
  },
];

/**
 * Starter prompts. Each one is answerable from the resume-derived knowledge
 * base — no question here references a technology Arvind has not worked with.
 */
export const suggestedQuestions: Record<string, readonly string[]> = {
  recruiter: [
    'Summarise his experience for a recruiter.',
    'Why would he be a good fit for an RPA role?',
    'What has he achieved at SBFC Finance?',
    'How much experience does he have?',
  ],
  technical: [
    'Which RPA platforms has he built on?',
    'Which databases has he worked with?',
    'How does he use Python alongside RPA?',
    'What does his automation architecture look like?',
  ],
  business: [
    'Explain his most impactful project in simple language.',
    'What business problems has his work solved?',
    'How much manual effort has he removed?',
    'What does an RPA developer actually do here?',
  ],
  general: [
    'What does Arvind specialise in?',
    'Show me projects involving Python.',
    'Does he have experience with APIs?',
    'What is his background in banking and lending?',
  ],
};

/**
 * The eight technologies the home page leads with.
 *
 * Every entry must be a real name from `src/data/skills.ts`. The strip used to
 * carry "SQL / PL-SQL" — a display label that existed in no data file, so it
 * matched no skill note and no case study, and nobody noticed because nothing
 * failed. It lives here rather than in the page so a test can hold it to that.
 */
export const trustedTechnologies: readonly string[] = [
  'TruBot (Datamatics)',
  'Automation Edge',
  'Python',
  'SQL',
  'PL/SQL',
  'Power BI',
  'Oracle',
  'Redshift',
];
