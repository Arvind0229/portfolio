import Link from 'next/link';
import { Icon } from '@/components/icons';
import { LinkButton, Reveal } from '@/components/ui';
import { profile } from '@/data/profile';
import { impactMetrics } from '@/data/impact';
import { whatsappLink } from '@/lib/contact/whatsapp';

export function ResumeSection() {
  /*
   * The resume is admin-managed now, so "there isn't one" is a state this
   * component has to render rather than a case that cannot happen. It is
   * reachable if the registry is emptied or a save goes wrong, and the failure
   * it replaces is the worse one: a Download button that 404s in front of a
   * recruiter, with nothing on screen to say why.
   *
   * `docx` is separately optional — a version can be PDF-only — so that button
   * is present or absent rather than pointing at an empty string.
   */
  const { pdf, docx, fileLabel } = profile.resume;
  const hasResume = pdf.length > 0;

  return (
    <div className="mt-12 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Reveal>
        <div className="glass-elevated flex h-full flex-col justify-between gap-8 p-7 sm:p-9">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
              Download or view
            </p>
            <p className="mt-3 font-display text-[1.6rem]">{fileLabel}</p>
            <p className="mt-2 max-w-md text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
              {hasResume
                ? docx
                  ? 'PDF and Word versions — same content, pick whichever your workflow prefers. Both are the exact file every page on this site is generated from.'
                  : 'The exact file every page on this site is generated from.'
                : 'The resume is being updated right now. Everything it contains is on this page, and you can ask the assistant anything it would have told you.'}
            </p>
          </div>

          {hasResume ? (
            <div className="flex flex-wrap gap-3" data-testid="resume-downloads">
              <LinkButton href={pdf} download size="lg">
                Download PDF
              </LinkButton>
              {docx ? (
                <LinkButton href={docx} download variant="secondary" size="lg">
                  Download DOCX
                </LinkButton>
              ) : null}
              <LinkButton href={pdf} target="_blank" variant="ghost" size="lg">
                View in browser
              </LinkButton>
            </div>
          ) : (
            /*
              Not a dead end. The two things that still work are offered, so
              a visitor who came here for the resume leaves with something.
            */
            <div
              className="surface-card flex flex-wrap items-center gap-3 p-4"
              data-testid="resume-unavailable"
              role="status"
            >
              <p className="text-[0.9rem] text-[var(--text-secondary)]">
                Résumé temporarily unavailable.
              </p>
              <LinkButton href="/assistant" variant="secondary" size="sm">
                Ask the assistant instead
              </LinkButton>
            </div>
          )}

          {/*
            A logo button in the row with the downloads, not a line of text
            below them.

            This is the moment a question forms — someone has just read the
            resume — and sending them back up to the contact section to ask it
            loses most of them. It is deliberately icon-only and outlined, so
            it reads as a third way to act rather than competing with the two
            downloads that are what this panel is for.

            The press animation is feedback for a click that opens a different
            application: WhatsApp takes a moment to come up, and without it the
            button looks like it did nothing.
          */}
          <div className="mt-5 flex items-center gap-3">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="resume-whatsapp"
              aria-label="Message Arvind on WhatsApp"
              /*
                The green is the point — see `--whatsapp` in globals.css for
                why there are two values and what each was measured against.
                The border picks it up at 38% so the button reads as one object
                rather than a green glyph sitting in a grey ring, and hover
                takes the border to full strength instead of switching to the
                site accent, which would have made a WhatsApp button turn blue
                under the cursor.
              */
              className="wa-press inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--whatsapp)_38%,var(--border))] text-[var(--whatsapp)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] hover:border-[var(--whatsapp)] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--whatsapp)_16%,transparent)]"
            >
              <Icon name="whatsapp" size={20} aria-hidden="true" />
            </a>
            <p className="text-[0.86rem] text-[var(--text-muted)]">
              Read it and have a question? Message me.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={90}>
        <div className="surface-card h-full p-7">
          <h2 className="font-display text-[1.05rem]">What is in it</h2>
          <dl className="mt-5 space-y-4">
            {impactMetrics.map((metric) => (
              <div key={metric.id} className="flex items-baseline gap-3">
                <dt className="font-display text-[1.35rem] leading-none text-[var(--accent-primary)]">
                  {metric.prefix}
                  {metric.value}
                  {metric.suffix}
                </dt>
                <dd className="text-[0.86rem] text-[var(--text-secondary)]">{metric.label}</dd>
              </div>
            ))}
          </dl>

          <div className="hairline my-6" />

          <p className="text-[0.86rem] leading-relaxed text-[var(--text-muted)]">
            Prefer to ask rather than read?{' '}
            <Link href="/assistant" className="text-[var(--accent-primary)] hover:opacity-80">
              The assistant
            </Link>{' '}
            answers from this same document, and tells you when something is not in it.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
