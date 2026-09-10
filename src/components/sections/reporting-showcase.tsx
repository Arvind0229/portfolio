import { Badge, Reveal } from '@/components/ui';
import {
  reportTemplates,
  sampleKpis,
  sampleRows,
  sampleValidationFlow,
} from '@/data/reporting';
import { cn } from '@/lib/utils/cn';

/**
 * Automated reporting showcase.
 *
 * The resume line "MIS reports delivered as formatted HTML mail-body
 * dashboards" undersells a real craft: these reports are what most of the
 * business actually sees of the automation. This section shows the shape of
 * them.
 *
 * Every number, region and label below is invented (see `data/reporting.ts`).
 * The real reports contain third-party PII and regulated NBFC data and cannot
 * appear on a public site, so the panels are labelled as illustrative in the
 * UI, not just in a comment.
 */
export function ReportingShowcase() {
  return (
    <section className="mt-24" aria-labelledby="reporting-heading">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[var(--accent-primary)]">
            Automated reporting
          </p>
          <Badge tone="neutral">Illustrative — sample data, no client information</Badge>
        </div>
        <h2 id="reporting-heading" className="mt-4 font-display text-[clamp(1.6rem,3.6vw,2.4rem)]">
          What the business actually sees
        </h2>
        <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-[var(--text-secondary)]">
          Most automations end in an inbox. These are the report formats built to land there —
          readable in the mail body itself, with the exception surfaced before the table. The
          layouts are real; the figures on this page are placeholders.
        </p>
      </Reveal>

      {/* --- A completion-summary mailer ------------------------------- */}
      <Reveal delay={80}>
        <figure className="surface-card mt-10 overflow-hidden p-0">
          <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-3">
            <span className="font-display text-[0.95rem]">Completion summary mailer</span>
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
              Sample layout
            </span>
          </figcaption>

          <div className="p-5 sm:p-7">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sampleKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className={cn(
                    'rounded-[var(--radius-md)] border-l-2 bg-[var(--surface-elevated)] px-4 py-3.5',
                    kpi.tone === 'positive' && 'border-l-[var(--success)]',
                    kpi.tone === 'attention' && 'border-l-[var(--warning)]',
                    kpi.tone === 'accent' && 'border-l-[var(--accent-secondary)]',
                    kpi.tone === 'neutral' && 'border-l-[var(--accent-primary)]',
                  )}
                >
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {kpi.label}
                  </dt>
                  {/* A div inside a dl may only contain dt and dd, so the
                      caption lives inside the dd rather than beside it. */}
                  <dd className="mt-1.5">
                    <span className="block font-display text-[1.65rem] leading-none text-[var(--text-primary)]">
                      {kpi.value}
                    </span>
                    <span className="mt-1.5 block text-[0.72rem] text-[var(--text-subtle)]">
                      {kpi.caption}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            {/* Progress rail */}
            <div className="mt-6">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: 'var(--surface-elevated)' }}
                role="img"
                aria-label="Sample progress bar at 94.7 percent"
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: '94.7%', background: 'var(--gradient-signature)' }}
                />
              </div>
              <p className="mt-2 text-right font-mono text-[0.68rem] text-[var(--text-muted)]">
                94.7% complete
              </p>
            </div>

            {/*
              The table scrolls horizontally on a phone, so the scroll
              container has to be focusable — otherwise a keyboard user can see
              the first two columns and reach the rest by no means at all.
            */}
            <div
              className="mt-6 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              tabIndex={0}
              role="region"
              aria-label="Region-wise completion, scrollable"
            >
              <table className="w-full min-w-[34rem] border-collapse text-[0.85rem]">
                <caption className="sr-only">
                  Sample region-wise completion table with placeholder data
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    {['Region', 'Completed', 'Pending', 'Total', 'Completion'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="py-2.5 pr-4 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--text-muted)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row) => {
                    const percent = (row.completed / row.total) * 100;
                    return (
                      <tr key={row.region} className="border-b border-[var(--border-subtle)]">
                        <th
                          scope="row"
                          className="py-2.5 pr-4 text-left font-normal text-[var(--text-primary)]"
                        >
                          {row.region}
                        </th>
                        <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{row.completed}</td>
                        <td
                          className={cn(
                            'py-2.5 pr-4',
                            row.pending > 0
                              ? 'text-[var(--warning)]'
                              : 'text-[var(--text-subtle)]',
                          )}
                        >
                          {row.pending}
                        </td>
                        <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{row.total}</td>
                        <td
                          className={cn(
                            'py-2.5 pr-4 font-medium',
                            percent === 100 ? 'text-[var(--success)]' : 'text-[var(--text-primary)]',
                          )}
                        >
                          {percent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </figure>
      </Reveal>

      {/* --- Validation flow ------------------------------------------- */}
      <Reveal delay={120}>
        <figure className="surface-card mt-4 p-5 sm:p-7">
          <figcaption className="font-display text-[0.95rem]">
            Validation &amp; exception flow
          </figcaption>
          <p className="mt-1.5 text-[0.85rem] text-[var(--text-muted)]">
            The control path behind a reconciliation report — pass, and the summary goes out; breach,
            and the owning team is alerted over email, SMS and WhatsApp before the next review.
          </p>
          <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
            {sampleValidationFlow.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[0.78rem] text-[var(--text-secondary)]">
                  {step}
                </span>
                {index < sampleValidationFlow.length - 1 ? (
                  <span aria-hidden="true" className="text-[var(--accent-primary)]">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </figure>
      </Reveal>

      {/* --- Template catalogue ---------------------------------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {reportTemplates.map((template, index) => (
          <Reveal key={template.id} delay={index * 70}>
            <article className="surface-card h-full p-6">
              <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {template.cadence}
              </p>
              <h3 className="mt-2 font-display text-[1.02rem]">{template.name}</h3>
              <p className="mt-2.5 text-[0.87rem] leading-relaxed text-[var(--text-secondary)]">
                {template.purpose}
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {template.builtWith.map((tool) => (
                  <li
                    key={tool}
                    className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 font-mono text-[0.66rem] text-[var(--text-muted)]"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <p className="mt-6 text-[0.8rem] leading-relaxed text-[var(--text-subtle)]">
          Sample data throughout. The production versions of these reports carry personal and
          regulated business information and are not reproduced here.
        </p>
      </Reveal>
    </section>
  );
}
