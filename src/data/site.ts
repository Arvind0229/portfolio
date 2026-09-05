import type {
  AssistantModeDefinition,
  FontSetDefinition,
  NavItem,
  ThemeDefinition,
} from '@/types';

export const siteConfig = {
  name: 'Arvind Gupta — RPA Developer',
  shortName: 'Arvind Gupta',
  description:
    'RPA Developer automating banking, NBFC and retail lending operations. 80+ production automations built end to end with TruBot, SQL/PL-SQL, Python and Power BI — with a grounded AI assistant that answers questions about the work.',
  /** Overridden at build time by NEXT_PUBLIC_SITE_URL when deployed. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  locale: 'en_IN',
} as const;

export const navigation: readonly NavItem[] = [
  { id: 'profile', label: 'Profile', href: '#profile' },
  { id: 'expertise', label: 'Expertise', href: '#expertise' },
  { id: 'experience', label: 'Experience', href: '#experience' },
  { id: 'projects', label: 'Projects', href: '#projects' },
  { id: 'skills', label: 'Stack', href: '#skills' },
  { id: 'architecture', label: 'Architecture', href: '#architecture' },
  { id: 'impact', label: 'Impact', href: '#impact' },
  { id: 'assistant', label: 'AI Assistant', href: '#assistant' },
  { id: 'contact', label: 'Contact', href: '#contact' },
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
    name: 'Engineering',
    tagline: 'Dark, technical, data-driven',
    defaultMode: 'dark',
    swatch: ['#38BDF8', '#8B5CF6'],
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
    description: 'Inter throughout — neutral, dense, corporate-safe.',
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
