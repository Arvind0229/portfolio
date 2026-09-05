'use client';

import { useState } from 'react';
import { Button, LinkButton, Reveal, Section, SectionHeading } from '@/components/ui';
import { profile } from '@/data/profile';

/**
 * Resume + contact.
 *
 * No backend contact form. A form here would need an SMTP credential, a spam
 * defence and a data-retention story, in exchange for doing what a mailto link
 * already does — with the visitor's own client, their own copy of the message,
 * and nothing stored anywhere. When there is a reason to collect submissions
 * server-side, that is the point to build /api/contact properly.
 */
export function ContactSection() {
  return (
    <>
      <Section id="resume" ariaLabel="Resume" className="pb-0">
        <SectionHeading
          eyebrow="Resume"
          title="The document itself"
          description="Everything on this site is drawn from this one file. Take it with you."
        />

        <Reveal delay={80}>
          <div className="surface-card mt-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-[1.05rem] font-medium">{profile.resume.fileLabel}</p>
              <p className="mt-1.5 text-[0.88rem] text-[var(--text-muted)]">
                PDF and Word versions — same content, pick whichever your workflow prefers.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href={profile.resume.pdf} download size="md">
                Download PDF
              </LinkButton>
              <LinkButton href={profile.resume.docx} download variant="secondary" size="md">
                Download DOCX
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section id="contact" ariaLabel="Contact">
        <SectionHeading
          eyebrow="Contact"
          title="Let's talk about the automation you need built"
          description="Fastest route is email. Phone works too — Mumbai time."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal>
            <ContactCard
              label="Email"
              value={profile.email}
              href={`mailto:${profile.email}?subject=${encodeURIComponent('Opportunity for Arvind Gupta — RPA Developer')}`}
              action="Compose email"
            />
          </Reveal>
          <Reveal delay={80}>
            <ContactCard
              label="Phone"
              value={profile.phone}
              href={`tel:${profile.phone.replace(/\s+/g, '')}`}
              action="Call"
            />
          </Reveal>
        </div>

        <Reveal delay={160}>
          <div className="glass mt-4 flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[1.05rem] font-medium">Based in {profile.location}</p>
              <p className="mt-1.5 max-w-lg text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                {profile.availability}. If you are hiring for RPA, automation engineering or
                process transformation in banking and lending, that is exactly the ground he has
                been working on.
              </p>
            </div>
            <LinkButton
              href={`mailto:${profile.email}?subject=${encodeURIComponent('Opportunity for Arvind Gupta — RPA Developer')}`}
              size="lg"
            >
              Get in touch
              <span
                aria-hidden="true"
                className="transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
              >
                →
              </span>
            </LinkButton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

function ContactCard({
  label,
  value,
  href,
  action,
}: {
  label: string;
  value: string;
  href: string;
  action: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unsupported — the value is visible and
      // selectable on screen, so there is nothing to recover from.
      setCopied(false);
    }
  }

  return (
    <div className="surface-card flex h-full flex-col justify-between gap-5 p-6">
      <div>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {label}
        </p>
        <p className="mt-2 break-all text-[1rem] text-[var(--text-primary)]">{value}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href={href} variant="secondary" size="sm">
          {action}
        </LinkButton>
        <Button variant="ghost" size="sm" onClick={() => void copy()} aria-live="polite">
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
