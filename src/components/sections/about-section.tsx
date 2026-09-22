import Link from 'next/link';
import { PortraitCard } from '@/components/profile/portrait';
import { Reveal } from '@/components/ui';
import { domainKnowledge, profile } from '@/data/profile';

/**
 * About.
 *
 * The narrative page: who he is in his own words, the domain vocabulary he
 * works in, and the facts a reader wants at a glance without hunting.
 *
 * ## Why the grid placement is explicit
 *
 * The portrait belongs at the top of the narrow column on a desktop, and
 * *first* on a phone — a profile page that opens with six hundred words and
 * shows the face somewhere below them has the order backwards.
 *
 * Those two requirements disagree about DOM order, and source order can only
 * satisfy one of them. So the portrait is written first, which is the order a
 * phone, a screen reader and a print stylesheet all follow, and is pinned back
 * into the second column from `lg` with explicit row and column starts. The
 * alternative — rendering the photo twice and hiding one per breakpoint —
 * ships the markup twice and tells assistive technology there are two
 * photographs on the page.
 */
export function AboutSection() {
  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-[1.45fr_1fr]">
      <Reveal className="lg:col-start-2 lg:row-start-1">
        <PortraitCard priority />
      </Reveal>

      <Reveal className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <p className="text-[1.04rem] leading-[1.8] text-[var(--text-secondary)]">
          {profile.summary}
        </p>

        <blockquote className="glass mt-8 p-6">
          <p className="font-display text-[1.05rem] leading-relaxed text-[var(--text-primary)]">
            “{profile.positioning}”
          </p>
          <footer className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {profile.name} · {profile.title}
          </footer>
        </blockquote>

        <div className="hairline my-8" />

        <h2 className="font-display text-[1.05rem]">Banking &amp; lending domain</h2>
        <p className="mt-2 text-[0.9rem] text-[var(--text-muted)]">
          The processes and vocabulary the automations actually run against.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {domainKnowledge.map((item) => (
            <li
              key={item}
              className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2.5 py-1 text-[0.76rem] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--text-secondary)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={120} className="lg:col-start-2 lg:row-start-2">
        <div className="surface-card card-reactive p-6">
          <h2 className="font-display text-[1rem]">At a glance</h2>
          <dl className="mt-4 space-y-3.5 text-[0.88rem]">
            <Row label="Current role" value={`${profile.title}, SBFC Finance Limited`} />
            <Row label="Based in" value={profile.location} />
            <Row label="Primary platform" value="TruBot (Datamatics)" />
            <Row label="Also hands-on" value="Automation Edge, UiPath (basic)" />
            <Row label="Databases" value="Oracle, MS SQL, MySQL, PostgreSQL, Redshift" />
            <Row label="Reporting" value="Power BI, Advanced Excel, HTML mailers" />
            <Row label="Open to" value={profile.availability} />
            {profile.exploring ? (
              <Row label="Currently exploring" value={profile.exploring} />
            ) : null}
          </dl>

          <div className="hairline my-6" />

          <ul className="space-y-2 text-[0.85rem]">
            {[
              // Education moved onto this page, so this is an anchor rather
              // than a route — sending someone to another URL for content that
              // is two screens below them is the navigation equivalent of a
              // redirect loop.
              { href: '#journey', label: 'Education & journey' },
              { href: '#skills', label: 'Skills & technology stack' },
              { href: '#projects', label: 'Case studies' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group inline-flex items-center gap-2 text-[var(--accent-primary)] transition-opacity hover:opacity-80"
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      <dt className="w-[7.5rem] shrink-0 text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
