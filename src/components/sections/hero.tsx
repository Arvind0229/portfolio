'use client';

import { LinkButton, Reveal } from '@/components/ui';
import { impactMetrics } from '@/data/impact';
import { profile } from '@/data/profile';

/**
 * Hero.
 *
 * Answers the four questions a visitor has in the first five seconds: who is
 * this, what do they do, what do they specialise in, and what can I do next.
 * Two CTAs only — one primary path into the work, one into the assistant.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto flex min-h-[92svh] w-full max-w-[76rem] flex-col justify-center px-5 pb-16 pt-28 sm:px-8 md:pt-32"
    >
      <Reveal>
        <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[var(--success)]"
            style={{ boxShadow: '0 0 0 3px color-mix(in srgb, var(--success) 22%, transparent)' }}
          />
          {profile.availability}
        </p>
      </Reveal>

      <Reveal delay={80}>
        <h1 className="mt-7 text-[clamp(2.6rem,8.4vw,5.4rem)]">
          <span className="block text-gradient">{profile.name}</span>
          <span className="mt-1 block text-[clamp(1.05rem,3vw,1.9rem)] font-normal tracking-[-0.01em] text-[var(--text-secondary)]">
            {profile.title} — Banking, NBFC &amp; Retail Lending Automation
          </span>
        </h1>
      </Reveal>

      <Reveal delay={160}>
        <p className="mt-7 max-w-2xl text-[clamp(1rem,2.2vw,1.15rem)] leading-relaxed text-[var(--text-secondary)]">
          {profile.positioning}
        </p>
      </Reveal>

      <Reveal delay={240}>
        <ul className="mt-7 flex flex-wrap gap-2" aria-label="Focus areas">
          {profile.focusAreas.map((area) => (
            <li
              key={area}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[0.76rem] text-[var(--text-secondary)]"
            >
              {area}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={320}>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <LinkButton href="#projects" size="lg">
            Explore the work
            <span
              aria-hidden="true"
              className="transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
            >
              →
            </span>
          </LinkButton>
          <LinkButton href="#assistant" variant="secondary" size="lg">
            Ask my AI assistant
          </LinkButton>
          <LinkButton
            href={profile.resume.pdf}
            variant="ghost"
            size="lg"
            download
            aria-label="Download resume as PDF"
          >
            Download resume
          </LinkButton>
        </div>
      </Reveal>

      <Reveal delay={400}>
        <dl className="glass mt-14 grid grid-cols-2 gap-x-4 gap-y-6 p-5 sm:p-6 md:grid-cols-4">
          {impactMetrics.map((metric) => (
            <div key={metric.id}>
              <dt className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {metric.label}
              </dt>
              <dd className="mt-1.5 font-display text-[1.9rem] leading-none text-[var(--text-primary)]">
                {metric.prefix}
                {metric.value}
                <span className="text-[var(--accent-primary)]">{metric.suffix}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
