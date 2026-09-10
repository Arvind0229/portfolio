import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageIntro, PageShell } from '@/components/layout/page-intro';
import { Badge, Reveal } from '@/components/ui';
import { AutomationPipeline } from '@/components/visuals/automation-pipeline';
import { projects } from '@/data/projects';

/**
 * A case study gets its own URL.
 *
 * Statically generated from the project data, so every case study is a real
 * page a recruiter can be sent directly — indexable, shareable, and correct
 * with JavaScript disabled.
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

  const index = projects.findIndex((item) => item.id === id);
  const next = projects[(index + 1) % projects.length];

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
              <div>
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Role
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">{project.role}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Delivered at
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">SBFC Finance Limited, Mumbai</dd>
              </div>
            </dl>
          }
        />
      </div>

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

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          <Block title="The business problem" body={project.problem} />
          <Block title="The automation solution" body={project.solution} />
          <Block title="Technically" body={project.technicalView} />

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
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </Reveal>
        </div>

        <div className="space-y-4">
          <Reveal delay={60}>
            <section className="glass-elevated p-6">
              <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                Result
              </h2>
              <ul className="mt-4 space-y-3">
                {project.impact.map((entry) => (
                  <li key={entry} className="flex gap-2.5 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                    <span aria-hidden="true" className="mt-0.5 text-[var(--success)]">
                      ✓
                    </span>
                    {entry}
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

      {next && next.id !== project.id ? (
        <Reveal delay={160}>
          <Link
            href={`/projects/${next.id}`}
            className="group mt-16 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 transition-[border-color] duration-[var(--motion-base)] hover:border-[var(--accent-primary)]"
          >
            <span>
              <span className="block font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Next case study
              </span>
              <span className="mt-1.5 block font-display text-[1.1rem]">{next.title}</span>
            </span>
            <span
              aria-hidden="true"
              className="text-[var(--accent-primary)] transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </Reveal>
      ) : null}
    </PageShell>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <Reveal>
      <section>
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          {title}
        </h2>
        <p className="mt-3 text-[1rem] leading-[1.75] text-[var(--text-secondary)]">{body}</p>
      </section>
    </Reveal>
  );
}
