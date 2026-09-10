'use client';

import { useState } from 'react';
import { IconTile, type IconName } from '@/components/icons';
import { PortraitAvatar } from '@/components/profile/portrait';
import { Button, LinkButton, Reveal } from '@/components/ui';
import { profile } from '@/data/profile';

const SUBJECT = encodeURIComponent('Opportunity for Arvind Gupta — RPA Developer');

/**
 * Contact.
 *
 * No backend form. A form here would need an SMTP credential, a spam defence
 * and a data-retention story, in exchange for doing what `mailto:` already
 * does — with the visitor keeping their own copy and nothing stored anywhere.
 * When there is a reason to collect submissions server-side, that is the point
 * to build `/api/contact` properly.
 */
export function ContactSection() {
  // Rendered from data rather than hard-coded, so the card appears when the
  // link exists and simply is not there when it does not.
  const linkedin = profile.socials.find((social) => social.id === 'linkedin');

  return (
    <>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Reveal>
          <ContactCard
            icon="mail"
            label="Email"
            value={profile.email}
            href={`mailto:${profile.email}?subject=${SUBJECT}`}
            action="Compose email"
            hint="Fastest route — usually answered the same day."
          />
        </Reveal>
        <Reveal delay={80}>
          <ContactCard
            icon="phone"
            label="Phone"
            value={profile.phone}
            href={`tel:${profile.phone.replace(/\s+/g, '')}`}
            action="Call"
            hint="Mumbai time, IST (UTC+5:30)."
          />
        </Reveal>
        {linkedin ? (
          <Reveal delay={160}>
            <ContactCard
              icon="linkedin"
              label="LinkedIn"
              value={linkedin.handle}
              href={linkedin.href}
              action="Open profile"
              hint="The professional history, in the place recruiters already look."
              external
            />
          </Reveal>
        ) : null}
      </div>

      <Reveal delay={160}>
        <div className="glass-elevated mt-4 flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
          {/* The face beside the details it belongs to. This is the panel a
              recruiter reads last before writing the email, and a portrait here
              does the one thing a portrait is good at: making the name on the
              other end a person. */}
          <div className="flex items-center gap-5">
            <PortraitAvatar size={76} />
            <div>
              <p className="font-display text-[1.25rem]">Based in {profile.location}</p>
              <p className="mt-2 max-w-lg text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
                {profile.availability}. If you are hiring for RPA, automation engineering
                or process transformation in banking and lending, that is exactly the
                ground he has been working on.
              </p>
            </div>
          </div>
          <LinkButton href={`mailto:${profile.email}?subject=${SUBJECT}`} size="lg">
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
    </>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
  action,
  hint,
  external = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  href: string;
  action: string;
  hint: string;
  /** Opens in a new tab, with the referrer withheld. */
  external?: boolean;
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
    <div className="surface-card card-reactive flex h-full flex-col justify-between gap-5 p-6">
      <div>
        <div className="flex items-center gap-3">
          <IconTile name={icon} size="sm" />
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {label}
          </p>
        </div>
        <p className="mt-2 break-all font-display text-[1.05rem] text-[var(--text-primary)]">
          {value}
        </p>
        <p className="mt-1.5 text-[0.8rem] text-[var(--text-subtle)]">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton
          href={href}
          variant="secondary"
          size="sm"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {action}
          {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
        </LinkButton>
        <Button variant="ghost" size="sm" onClick={() => void copy()} aria-live="polite">
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
