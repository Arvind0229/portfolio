import Link from 'next/link';
import { Badge, Reveal } from '@/components/ui';
import type { ProjectCaseStudy, ProjectDepth, ProjectMetric } from '@/types';

/**
 * The depth layer, on a page a person can read.
 *
 * ## Why this file exists
 *
 * Until now `ProjectDepth` fed the AI assistant and nothing else — `grep` for
 * `project.depth` returned one consumer, `lib/ai/knowledge.ts`. Everything
 * Arvind could write in the admin panel was answerable by the assistant and
 * invisible to a visitor, which is a strange place for the most detailed
 * writing on the site to live.
 *
 * ## Nothing renders unless it has content
 *
 * Every section below returns `null` when its field is absent. That is the
 * central rule: a visible heading with nothing under it reads as a loading
 * state that never finished, and it invites filling the gap with something
 * plausible. An absent section is honest; an empty one is an invitation to
 * invent.
 *
 * So the page is *complete* at every level of fill. With no depth at all it is
 * the case study it always was. With one field it gains one section.
 *
 * ## What is not here, deliberately
 *
 * No `solution`, `technologies`, `impact` or `challenges` heading duplicating
 * the case study's own — those are rendered by the page around this component
 * and are authoritative there (ADR-004 §3). This file renders only what
 * nothing else holds.
 */

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

/**
 * The numbers, first.
 *
 * Placed above the prose on every width, and deliberately so on mobile: a
 * recruiter scanning on a phone stops for a figure, and prose below the fold
 * is prose nobody reaches. On a narrow screen this scrolls horizontally rather
 * than shrinking the numbers to the point of being decorative — the row is
 * marked as a list so that is announced, not merely visual.
 */
export function ProjectMetrics({ metrics }: { metrics?: readonly ProjectMetric[] }) {
  if (!metrics?.length) return null;

  return (
    <Reveal>
      <section aria-labelledby="cs-metrics" className="mt-10">
        <h2 id="cs-metrics" className="sr-only">
          Outcomes in numbers
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="cs-metrics">
          {metrics.map((metric) => (
            <li
              key={metric.label}
              className="surface-card min-w-0 p-5"
              data-testid={`cs-metric-${metric.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              <p className="font-display text-[1.9rem] leading-none break-words text-[var(--accent-primary)]">
                {metric.value}
              </p>
              <p className="mt-2 break-words text-[0.88rem] text-[var(--text-primary)]">{metric.label}</p>
              {metric.note ? (
                <p className="mt-1 break-words text-[0.78rem] leading-relaxed text-[var(--text-muted)]">
                  {metric.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Prose and list sections                                             */
/* ------------------------------------------------------------------ */

function Prose({ title, body, testId }: { title: string; body?: string; testId: string }) {
  if (!body) return null;
  return (
    <Reveal>
      <section data-testid={testId}>
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          {title}
        </h2>
        <p className="mt-3 text-[1rem] leading-[1.75] break-words text-[var(--text-secondary)]">{body}</p>
      </section>
    </Reveal>
  );
}

function Listing({
  title,
  items,
  testId,
  numbered = false,
}: {
  title: string;
  items?: readonly string[];
  testId: string;
  numbered?: boolean;
}) {
  if (!items?.length) return null;
  const List = numbered ? 'ol' : 'ul';
  return (
    <Reveal>
      <section data-testid={testId}>
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          {title}
        </h2>
        <List className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3 text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
              {numbered ? (
                <span
                  aria-hidden="true"
                  className="mt-[0.15em] shrink-0 font-mono text-[0.72rem] tabular-nums text-[var(--text-muted)]"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]"
                />
              )}
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </List>
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Before / after                                                      */
/* ------------------------------------------------------------------ */

/**
 * Two states side by side on a wide screen, stacked on a narrow one.
 *
 * Renders when *either* half is present, because "how it was done before" is
 * worth reading on its own and waiting for both would hide it.
 */
function BeforeAfter({ depth }: { depth: ProjectDepth }) {
  if (!depth.before && !depth.after) return null;
  return (
    <Reveal>
      <section data-testid="cs-before-after">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          What changed
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {depth.before ? (
            <div className="surface-card min-w-0 p-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Before
              </p>
              <p className="mt-2 break-words text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
                {depth.before}
              </p>
            </div>
          ) : null}
          {depth.after ? (
            <div className="surface-card min-w-0 border-[var(--accent-primary)] p-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--accent-primary)]">
                After
              </p>
              <p className="mt-2 break-words text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
                {depth.after}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Challenges and decisions                                            */
/* ------------------------------------------------------------------ */

/**
 * The part an interviewer actually probes, and the part that was written into
 * the admin panel months ago and has never been on a page.
 *
 * `<details>` rather than a JavaScript accordion: it is open-able without
 * hydration, searchable by the browser's own find, keyboard-operable for free,
 * and it animates nothing that would need a reduced-motion rule.
 */
function ChallengesAndDecisions({ depth }: { depth: ProjectDepth }) {
  const challenges = depth.challenges ?? [];
  const decisions = depth.decisions ?? [];
  if (!challenges.length && !decisions.length) return null;

  return (
    <Reveal>
      <section data-testid="cs-challenges">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          What was hard, and what was decided
        </h2>
        <div className="mt-3 space-y-2">
          {challenges.map((entry) => (
            <details
              key={entry.challenge}
              className="surface-card group min-w-0 p-4"
              data-testid="cs-challenge"
            >
              <summary className="cursor-pointer list-none break-words text-[0.95rem] text-[var(--text-primary)] marker:hidden">
                <span className="mr-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Challenge
                </span>
                {entry.challenge}
              </summary>
              <p className="mt-3 break-words text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
                {entry.resolution}
              </p>
            </details>
          ))}
          {decisions.map((entry) => (
            <details
              key={entry.decision}
              className="surface-card group min-w-0 p-4"
              data-testid="cs-decision"
            >
              <summary className="cursor-pointer list-none break-words text-[0.95rem] text-[var(--text-primary)] marker:hidden">
                <span className="mr-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Decision
                </span>
                {entry.decision}
              </summary>
              <p className="mt-3 break-words text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
                {entry.why}
              </p>
              {entry.alternatives ? (
                <p className="mt-2 break-words text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em]">
                    Considered
                  </span>{' '}
                  {entry.alternatives}
                </p>
              ) : null}
            </details>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Operating facts                                                     */
/* ------------------------------------------------------------------ */

/** Scale, systems, timeline, team, failure handling — a definition list. */
function OperatingFacts({ depth }: { depth: ProjectDepth }) {
  const rows: { term: string; value: string }[] = [];
  if (depth.scale?.length) rows.push({ term: 'Scale', value: depth.scale.join(' · ') });
  if (depth.systems?.length) rows.push({ term: 'Systems', value: depth.systems.join(' · ') });
  if (depth.timeline) rows.push({ term: 'Timeline', value: depth.timeline });
  if (depth.team) rows.push({ term: 'Team', value: depth.team });
  if (depth.failureHandling) rows.push({ term: 'When a run fails', value: depth.failureHandling });
  if (!rows.length) return null;

  return (
    <Reveal>
      <section data-testid="cs-facts">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          Scale and operations
        </h2>
        <dl className="surface-card mt-3 divide-y divide-[var(--border-subtle)] p-5">
          {rows.map((row) => (
            <div key={row.term} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:pt-1">
                {row.term}
              </dt>
              <dd className="min-w-0 break-words text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

function Faq({ depth }: { depth: ProjectDepth }) {
  if (!depth.faq?.length) return null;
  return (
    <Reveal>
      <section data-testid="cs-faq">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          Questions people ask
        </h2>
        <div className="mt-3 space-y-2">
          {depth.faq.map((entry) => (
            <details key={entry.question} className="surface-card min-w-0 p-4">
              <summary className="cursor-pointer list-none break-words text-[0.95rem] text-[var(--text-primary)] marker:hidden">
                {entry.question}
              </summary>
              <p className="mt-3 break-words text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
                {entry.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Composed groups, used by the page                                   */
/* ------------------------------------------------------------------ */

/**
 * "What this is", above the problem.
 *
 * `depth.businessProblem` is deliberately **not** rendered here. It is the long
 * form of `project.problem`, and giving it its own heading would put two
 * headings called something like "the problem" on one page. The page passes it
 * to the existing problem block as a second paragraph instead, so the reader
 * gets the one-line statement and then the detail, under one heading.
 */
export function CaseStudyOverview({ depth }: { depth?: ProjectDepth }) {
  if (!depth) return null;
  return <Prose title="Overview" body={depth.overview} testId="cs-overview" />;
}

/** Depth that belongs after the existing solution and process blocks. */
export function CaseStudyMechanics({ depth }: { depth?: ProjectDepth }) {
  if (!depth) return null;
  return (
    <>
      <Listing title="Architecture" items={depth.architecture} testId="cs-architecture" />
      <Listing title="What it does when it runs" items={depth.workflow} testId="cs-workflow" numbered />
      <OperatingFacts depth={depth} />
      <ChallengesAndDecisions depth={depth} />
    </>
  );
}

/**
 * Depth that belongs after the existing impact block, full width.
 *
 * This one owns its own spacing wrapper, because the page cannot know in
 * advance whether anything inside will render — a `mt-12` div around four
 * nulls is three rem of blank page between the grid and the related work.
 */
export function CaseStudyOutcome({ depth }: { depth?: ProjectDepth }) {
  if (!depth) return null;
  const hasOutcome = Boolean(
    depth.before ||
      depth.after ||
      depth.lessonsLearned?.length ||
      depth.futureEnhancements?.length ||
      depth.faq?.length,
  );
  if (!hasOutcome) return null;

  return (
    <div className="mt-12 space-y-10">
      <BeforeAfter depth={depth} />
      <Listing title="What it taught" items={depth.lessonsLearned} testId="cs-lessons" />
      <Listing title="What could come next" items={depth.futureEnhancements} testId="cs-future" />
      <Faq depth={depth} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Related projects                                                    */
/* ------------------------------------------------------------------ */

/**
 * Related by what they share, not by where they sit in a file.
 *
 * The page used to link "the next one in the array", which would happily send
 * a reader from a compliance bot to an HR automation for no reason other than
 * ordering. Scoring is in `relatedProjects`.
 *
 * Renders nothing when nothing is related — a "Related" heading over one
 * arbitrary card is worse than no heading.
 */
export function RelatedProjects({ projects }: { projects: readonly ProjectCaseStudy[] }) {
  if (!projects.length) return null;

  return (
    <Reveal delay={120}>
      <section className="mt-16" aria-labelledby="cs-related" data-testid="cs-related">
        <h2
          id="cs-related"
          className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--text-muted)]"
        >
          Related work
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id} className="min-w-0">
              <Link
                href={`/projects/${project.id}`}
                data-testid={`cs-related-${project.id}`}
                className="surface-card card-reactive flex h-full min-w-0 flex-col gap-2 p-5 transition-[border-color] duration-[var(--motion-base)] hover:border-[var(--accent-primary)]"
              >
                <Badge>{project.category}</Badge>
                <span className="break-words font-display text-[1.02rem] text-[var(--text-primary)]">
                  {project.title}
                </span>
                <span className="break-words text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
                  {project.businessView}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}
