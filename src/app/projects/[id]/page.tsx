import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageIntro, PageShell } from '@/components/layout/page-intro';
import {
  CaseStudyMechanics,
  CaseStudyOutcome,
  CaseStudyOverview,
  ProjectMetrics,
  RelatedProjects,
} from '@/components/sections/case-study';
import { Badge, Reveal } from '@/components/ui';
import { AutomationPipeline } from '@/components/visuals/automation-pipeline';
import { projects, relatedProjects, relationsFor } from '@/data/projects';

/**
 * A case study gets its own URL.
 *
 * Statically generated from the project data, so every case study is a real
 * page a recruiter can be sent directly — indexable, shareable, and correct
 * with JavaScript disabled.
 *
 * ## Reading order
 *
 * What → Problem → Solution → Role → Technology → Outcome.
 *
 * The page keeps the sections it always had and interleaves the depth layer
 * around them, rather than replacing them: `project.problem` is the one-line
 * statement, `depth.businessProblem` the long form, and they share a heading.
 *
 * ## Depth is already filtered
 *
 * `project.depth` comes from `publicDepthFor()` in `src/data/projects.ts`,
 * which drops a record marked `visibility: 'internal'`. This page must not
 * reach into the unfiltered depth store — that single choke point is what
 * keeps internal writing out of both the page and the AI's retrieval set at
 * once, and a unit test scans this directory to keep it that way. The scan
 * matches the identifier in comments too, deliberately: a test that trusts
 * itself to tell code from prose is a test that can be talked out of failing.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const project = projects.find((item) => item.id === id);
  if (!project) return { title: 'Project not found' };

  return {
    title: project.title,
    description: project.businessView,
    openGraph: { title: project.title, description: project.businessView },
  };
}

export default async function ProjectPage({ params }: Params) {
  const { id } = await params;
  const project = projects.find((item) => item.id === id);
  if (!project) notFound();

  const depth = project.depth;
  const relations = relationsFor(project.id);
  const related = relatedProjects(project.id, 3);

  /**
   * A removed company loses the line and nothing else — no placeholder, no
   * hardcoded employer. The previous version of this page printed "SBFC
   * Finance Limited, Mumbai" as a literal on every case study, which would
   * have quietly become a false statement the first time a project was added
   * from anywhere else.
   */
  const employer = relations.company
    ? [relations.company.name, relations.company.location].filter(Boolean).join(', ')
    : null;

  return (
    <PageShell>
      <Link
        href="/#projects"
        className="group inline-flex items-center gap-2 text-[0.85rem] text-[var(--text-muted)] transition-colors hover:text-[var(--accent-primary)]"
      >
        <span
          aria-hidden="true"
          className="transition-transform duration-[var(--motion-fast)] group-hover:-translate-x-1"
        >
          ←
        </span>
        Back to projects
      </Link>

      <div className="mt-6">
        <PageIntro
          eyebrow={project.category}
          title={project.title}
          description={project.businessView}
          aside={
            <dl className="surface-card space-y-3 p-5 text-[0.85rem]">
              <div className="min-w-0">
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Role
                </dt>
                <dd className="mt-1 min-w-0 break-words text-[var(--text-secondary)]">{project.role}</dd>
              </div>
              {employer ? (
                <div className="min-w-0">
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Delivered at
                  </dt>
                  <dd className="mt-1 min-w-0 break-words text-[var(--text-secondary)]" data-testid="cs-employer">
                    {employer}
                  </dd>
                </div>
              ) : null}
              {relations.skills.length ? (
                <div className="min-w-0">
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Skills
                  </dt>
                  <dd className="mt-1.5 flex min-w-0 flex-wrap gap-1.5">
                    {relations.skills.map((skill) => (
                      <Badge key={skill.id} tone="neutral">
                        {skill.name}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          }
        />
      </div>

      {/* The numbers, above everything a reader would have to scroll past. */}
      <ProjectMetrics metrics={depth?.metrics} />

      {/* The workflow, drawn */}
      <Reveal delay={80}>
        <div className="glass mt-12 p-5 sm:p-7">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-[var(--accent-primary)]">
            How it runs
          </p>
          <AutomationPipeline
            className="mt-5"
            stages={project.process.slice(0, 5).map((step, stepIndex) => ({
              id: `${project.id}-step-${stepIndex}`,
              label: step.split(/[,;]/)[0]?.slice(0, 34) ?? `Step ${stepIndex + 1}`,
            }))}
          />
        </div>
      </Reveal>

      <div className="mt-12 grid min-w-0 gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-10">
          <CaseStudyOverview depth={depth} />
          <Block
            title="The business problem"
            body={project.problem}
            more={depth?.businessProblem}
            testId="cs-problem"
          />
          <Block title="The automation solution" body={project.solution} />

          <Reveal>
            <section>
              <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                Process
              </h2>
              <ol className="mt-4 space-y-3">
                {project.process.map((step, stepIndex) => (
                  <li key={step} className="flex gap-3.5 text-[0.92rem] text-[var(--text-secondary)]">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] font-mono text-[0.66rem] text-[var(--accent-primary)]">
                      {stepIndex + 1}
                    </span>
                    <span className="min-w-0 break-words leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </Reveal>

          <CaseStudyMechanics depth={depth} />

          <Block title="Technically" body={project.technicalView} />
        </div>

        <div className="min-w-0 space-y-4">
          <Reveal delay={60}>
            <section className="glass-elevated p-6">
              <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                Result
              </h2>
              <ul className="mt-4 space-y-3">
                {project.impact.map((entry) => (
                  <li key={entry} className="flex gap-2.5 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--success)]">
                      ✓
                    </span>
                    <span className="min-w-0 break-words">{entry}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          <Reveal delay={120}>
            <section className="surface-card p-6">
              <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Technologies
              </h2>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <li key={tech}>
                    <Badge tone="neutral">{tech}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        </div>
      </div>

      <CaseStudyOutcome depth={depth} />

      <RelatedProjects projects={related} />
    </PageShell>
  );
}

function Block({
  title,
  body,
  more,
  testId,
}: {
  title: string;
  body: string;
  /** The long form of the same thing, under the same heading. */
  more?: string;
  testId?: string;
}) {
  return (
    <Reveal>
      <section data-testid={testId}>
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          {title}
        </h2>
        <p className="mt-3 break-words text-[1rem] leading-[1.75] text-[var(--text-secondary)]">{body}</p>
        {more ? (
          <p
            className="mt-4 break-words text-[1rem] leading-[1.75] text-[var(--text-secondary)]"
            data-testid={testId ? `${testId}-detail` : undefined}
          >
            {more}
          </p>
        ) : null}
      </section>
    </Reveal>
  );
}
