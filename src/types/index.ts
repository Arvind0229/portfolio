/**
 * Domain types for the portfolio content layer.
 *
 * Everything rendered on the site — and everything the AI agent is allowed to
 * say — is derived from values typed here. There is exactly one source of
 * truth (`src/data`), so updating the resume never means editing components.
 */

export type ThemeId = 'enterprise' | 'engineering' | 'studio';
export type ColorMode = 'light' | 'dark';
export type FontSetId = 'precision' | 'technical' | 'editorial';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  /** Mode this theme was designed in; applied the first time a visitor picks it. */
  defaultMode: ColorMode;
  /** Two swatches used by the theme switcher preview. */
  swatch: readonly [string, string];
}

export interface FontSetDefinition {
  id: FontSetId;
  name: string;
  description: string;
  /** Short preview string rendered in the switcher using the actual font. */
  preview: string;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  handle: string;
}

export interface Profile {
  name: string;
  shortName: string;
  title: string;
  positioning: string;
  summary: string;
  /** Same facts as `summary`, phrased about him — quoted by the AI layer. */
  summaryThirdPerson: string;
  /** Same facts as `positioning`, phrased about him. */
  positioningThirdPerson: string;
  location: string;
  email: string;
  phone: string;
  availability: string;
  focusAreas: readonly string[];
  socials: readonly SocialLink[];
  resume: {
    pdf: string;
    docx: string;
    fileLabel: string;
  };
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  period: string;
  current: boolean;
  summary: string;
  highlights: readonly string[];
  technologies: readonly string[];
}

export type ProjectCategory =
  | 'Operations Automation'
  | 'Reporting & BI'
  | 'Compliance'
  | 'IT & Access Management';

export interface ProjectCaseStudy {
  id: string;
  title: string;
  category: ProjectCategory;
  /** One line a non-technical reader understands immediately. */
  businessView: string;
  /** One line an engineer understands immediately. */
  technicalView: string;
  problem: string;
  solution: string;
  role: string;
  process: readonly string[];
  impact: readonly string[];
  technologies: readonly string[];
  featured: boolean;
}

export interface SkillGroup {
  id: string;
  name: string;
  description: string;
  skills: readonly string[];
}

export interface ImpactMetric {
  id: string;
  value: number;
  /** Rendered after the animated value, e.g. "+" or "%". */
  suffix: string;
  prefix: string;
  label: string;
  detail: string;
}

export interface ArchitectureFlow {
  id: string;
  name: string;
  /** True only when this reflects a system actually built, per the resume. */
  verified: boolean;
  caption: string;
  steps: readonly {
    id: string;
    label: string;
    detail: string;
  }[];
}

export interface EducationItem {
  id: string;
  qualification: string;
  institution: string;
  period: string;
}

export interface ExpertisePillar {
  id: string;
  title: string;
  description: string;
  points: readonly string[];
}

/* ------------------------------------------------------------------ */
/* AI layer                                                            */
/* ------------------------------------------------------------------ */

export type AssistantMode = 'recruiter' | 'technical' | 'business' | 'general';

export interface AssistantModeDefinition {
  id: AssistantMode;
  label: string;
  description: string;
  /** Shown under the composer so the visitor knows what changed. */
  hint: string;
}

export type KnowledgeKind =
  | 'profile'
  | 'experience'
  | 'project'
  | 'skill'
  | 'achievement'
  | 'education'
  | 'domain'
  | 'contact';

export interface KnowledgeChunk {
  id: string;
  kind: KnowledgeKind;
  title: string;
  text: string;
  /** Extra lexical surface for retrieval (synonyms, tech names, aliases). */
  keywords: readonly string[];
  sourceSection: string;
}

export interface RetrievedChunk {
  chunk: KnowledgeChunk;
  score: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequestBody {
  message: string;
  mode: AssistantMode;
  sessionId?: string;
}

export interface AssistantSource {
  id: string;
  title: string;
  section: string;
}

export interface AssistantResponseBody {
  ok: true;
  answer: string;
  mode: AssistantMode;
  sessionId: string;
  sources: AssistantSource[];
  /** Which retrieval tool the orchestrator selected. Useful, non-sensitive. */
  toolUsed: string;
  grounded: boolean;
  suggestions: string[];
}

export interface AssistantErrorBody {
  ok: false;
  error: string;
  code:
    | 'invalid_request'
    | 'rate_limited'
    | 'upstream_unavailable'
    | 'blocked'
    | 'server_error';
  retryAfterSeconds?: number;
}
