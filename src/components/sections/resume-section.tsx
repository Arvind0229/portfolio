import Link from 'next/link';
import { Icon } from '@/components/icons';
import { LinkButton, Reveal } from '@/components/ui';
import { profile } from '@/data/profile';
import { impactMetrics } from '@/data/impact';
import { whatsappLink } from '@/lib/contact/whatsapp';

export function ResumeSection() {
  return (
    <div className="mt-12 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Reveal>
        <div className="glass-elevated flex h-full flex-col justify-between gap-8 p-7 sm:p-9">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
              Download or view
            </p>
            <p className="mt-3 font-display text-[1.6rem]">{profile.resume.fileLabel}</p>
            <p className="mt-2 max-w-md text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
              PDF and Word versions — same content, pick whichever your workflow prefers. Both are
              the exact file every page on this site is generated from.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <LinkButton href={profile.resume.pdf} download size="lg">
              Download PDF
            </LinkButton>
            <LinkButton href={profile.resume.docx} download variant="secondary" size="lg">
              Download DOCX
            </LinkButton>
            <LinkButton href={profile.resume.pdf} target="_blank" variant="ghost" size="lg">
              View in browser
            </LinkButton>
          </div>

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
              className="wa-press inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
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
