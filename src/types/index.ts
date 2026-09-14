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

/**
 * The portrait, described as data rather than hard-coded into a component.
 *
 * It is a public path, not a bundler import, for the same reason the resume is
 * (`resume.pdf` below): `profile.ts` is read by the AI knowledge layer on the
 * server, and importing a binary there would pull image metadata into a bundle
 * that has no use for it. The trade is that the intrinsic size has to be stated
 * rather than inferred — so a unit test measures the file and asserts these
 * numbers match, which is the part a person would otherwise forget on a recrop.
 *
 * `width`/`height` are required by `next/image` to reserve the box before the
 * bytes arrive; without them the page reflows as the photo lands (CLS).
 * `blurDataURL` is a ~900-byte 12×15 JPEG inlined as a data URI — allowed by
 * the CSP (`img-src 'self' data:`) and cheaper than a network round trip for a
 * placeholder.
 */
export interface ProfilePhoto {
  src: string;
  /** Intrinsic pixel width of the file at `src`. */
  width: number;
  /** Intrinsic pixel height of the file at `src`. */
  height: number;
  /**
   * Alternative text. For a portrait the useful alt is the person's name — a
   * screen reader user needs to know whose face this is, not what they are
   * wearing.
   */
  alt: string;
  /** Inline low-resolution placeholder shown while the photo decodes. */
  blurDataURL: string;
  /**
   * Where the face sits, as a CSS `object-position`, for crops tighter than
   * the source aspect ratio (the round avatar). Centring a 4:5 portrait into a
   * square otherwise lands on the collar.
   */
  facePosition: string;
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
  photo: ProfilePhoto;
  socials: readonly SocialLink[];
  /**
   * Resolved from the resume registry at build time, not written by hand.
   *
   * `docx` became optional when uploads started managing this: a version can be
   * PDF-only, and the alternative — an empty string that renders as a download
   * link to nowhere — is the bug this whole change exists to remove.
   */
  resume: {
    pdf: string;
    docx?: string;
    fileLabel: string;
  };
}

/**
 * What the employer does, so a reader who has not heard of them still
 * understands the context the work sat in.
 *
 * These describe the *company*, not Arvind — the same line the skill notes
 * draw. Each is checked against the company's own site and public reporting,
 * and the source is recorded in `src/data/experience.ts`.
 */
export interface CompanyProfile {
  /** One-line sector label, for the chip beside the company name. */
  sector: string;
  /** What the business actually does. Public, checkable. */
  what: string;
  /** Why that context shapes the work — the bridge to the role. */
  relevance: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  /** Optional: absent is fine, the section renders without it. */
  companyProfile?: CompanyProfile;
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

/*
 * These three are `type` aliases rather than `interface` declarations, and the
 * difference is load-bearing rather than stylistic. An object type alias gets
 * an implicit index signature; an interface does not. The admin form edits all
 * three through one generic row editor typed as `Record<string, string>`, and
 * with interfaces every use of it needed a double cast through `unknown` —
 * three places where the compiler had been told to stop checking exactly where
 * user input enters the model. As aliases they assign directly and the casts
 * are gone.
 */

/**
 * A named trade-off: the thing that was hard, and what was done about it.
 *
 * Kept as a pair rather than a sentence because the assistant is asked these
 * two halves separately — "what was difficult about X" and "how did he solve
 * it" — and a single blob answers neither well.
 */
export type ProjectChallenge = {
  challenge: string;
  resolution: string;
};

/** An engineering decision, with the reasoning that is the actual signal. */
export type ProjectDecision = {
  decision: string;
  why: string;
  /** What was considered and not chosen. Optional: sometimes there was no fork. */
  alternatives?: string;
};

/** Anything that did not fit the fields above, in his own words. */
export type ProjectFaq = {
  question: string;
  answer: string;
};

/**
 * The depth layer.
 *
 * Everything here is **optional**, and that is the whole design. The resume
 * gives each project a problem, a solution and a handful of outcomes — enough
 * for a card, nowhere near enough for "ask it anything about this project".
 * The fields below are where the detail that only Arvind knows goes.
 *
 * The rule the rest of the system enforces: **a field that is absent is a
 * question the assistant answers with "that is not in the profile"**, never
 * with a plausible guess. So an empty field costs nothing but a missing
 * answer, while a wrong field costs his credibility in an interview. Nothing
 * in here may be inferred, rounded, or filled in from what an RPA project
 * "usually" looks like — it is stated by him or it is not there.
 */
export interface ProjectDepth {
  /** Volumes, run frequency, how many people or branches it touches. */
  scale?: readonly string[];
  /** The actual applications, databases and interfaces it works against. */
  systems?: readonly string[];
  /** What was hard, and what was done about it. */
  challenges?: readonly ProjectChallenge[];
  /** Trade-offs made and why — the part interviewers actually probe. */
  decisions?: readonly ProjectDecision[];
  /** How long from first requirement discussion to running in production. */
  timeline?: string;
  /** Who else was involved and what exactly was his part. */
  team?: string;
  /** How a failed run is noticed, by whom, and what happens next. */
  failureHandling?: string;
  /** How the work was done before this existed. */
  before?: string;
  /** What measurably changed after. Only figures he states. */
  after?: string;
  /** Free-form leftovers, in his own words. */
  faq?: readonly ProjectFaq[];
}

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
  /**
   * Detail beyond what the resume carries. Absent until Arvind supplies it —
   * see `ProjectDepth`. The site renders whatever is present and says nothing
   * about what is not.
   */
  depth?: ProjectDepth;
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
  /**
   * The whole this value is a part of, when there honestly is one.
   *
   * Only present where a proportion is real: "80%+ manual effort reduced" is a
   * share of 100, so a bar filled to 80% tells the truth. "80+ automations",
   * "5 databases" and "3 interns" are counts with no denominator — drawing a
   * bar for them would invent a scale the resume does not have, and a reader
   * would take the fill level as information. So they get no meter, and the
   * inconsistency on the page is the honest outcome rather than a design flaw
   * to paper over.
   */
  outOf?: number;
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

/**
 * One uploaded resume. `pdf` is required — a version nobody can download as a
 * PDF is not a resume — and `docx` is optional, because it is a convenience
 * that has not always existed.
 */
export interface ResumeVersion {
  id: string;
  label: string;
  pdf: string;
  docx?: string;
  uploadedAt?: string;
  bytes?: number;
}

/**
 * `active` is the only field that decides what the site serves. Nothing is
 * overwritten on upload, so rolling back is repointing this at an older id —
 * the file it names is still there, unchanged.
 */
export interface ResumeRegistry {
  active: string | null;
  versions: readonly ResumeVersion[];
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
  /**
   * Which project this chunk belongs to, when it belongs to one.
   *
   * Retrieval uses it to refuse a specific, dangerous mistake. Facet chunks
   * carry globally rare vocabulary — "hardest", "challenge", "how often" — so
   * their IDF is enormous and one project's difficulty could outrank every
   * chunk of the project the visitor actually named. Asked what was hardest
   * about the HR automation, the assistant led with a difficulty from the
   * compliance bot: one project's story told under another's name, which is a
   * worse failure than saying nothing, and the kind a reader has no way to
   * catch.
   *
   * With this set, a query that clearly names one project cannot be answered
   * from another's chunks.
   */
  projectId?: string;
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
