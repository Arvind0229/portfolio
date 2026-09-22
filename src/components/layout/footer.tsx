import Link from 'next/link';
import { navigation, secondaryNavigation } from '@/data/site';
import { profile } from '@/data/profile';
import { SplitWords } from '@/components/ui';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer no-print border-t border-[var(--border-subtle)]">
      {/* A run passing along the top edge: three pulses travelling a line,
          the site's automation motif, drawn in CSS. Decoration only. */}
      <div className="footer-flow" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="mx-auto w-full max-w-[76rem] px-5 pb-2 pt-16 sm:px-8">
        <p className="font-display text-[clamp(1.6rem,4.4vw,2.6rem)] leading-[1.1]">
          <SplitWords text="Same processes." />{' '}
          <span className="footer-shimmer">Bigger possibilities.</span>
        </p>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
          Building automated, efficient and scalable operations for banking, NBFC and retail
          lending. Open to new opportunities and impactful collaborations.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="footer-status">
            <span aria-hidden="true" className="footer-status-dot" />
            Open to new opportunities
          </span>
          <a href="#main" className="footer-top fx-btn" data-fx="ripple">
            Back to top
            <span aria-hidden="true" className="footer-top-arrow">
              ↑
            </span>
          </a>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[76rem] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-[1rem] font-semibold">{profile.name}</p>
          <p className="mt-2 max-w-sm text-[0.87rem] leading-relaxed text-[var(--text-muted)]">
            {profile.title} — automating banking, NBFC and retail lending operations from Mumbai.
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            Sections
          </p>
          <ul className="mt-3 space-y-1.5">
            {[...navigation.slice(1), ...secondaryNavigation].map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="footer-link text-[0.85rem] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            Direct
          </p>
          <ul className="mt-3 space-y-1.5">
            {profile.socials.map((social) => {
              // `mailto:` and `tel:` stay in place; anything on the web opens
              // in a new tab so a visitor reading the site does not lose it.
              // `rel` is set explicitly rather than leaning on the implicit
              // `noopener` modern browsers apply — it also drops the referrer,
              // which a personal site has no reason to leak.
              const external = /^https?:/i.test(social.href);
              return (
                <li key={social.id}>
                  <a
                    href={social.href}
                    {...(/^mailto:/i.test(social.href) ? { 'data-fx': 'mail' } : {})}
                    {...(external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className="footer-link break-all text-[0.85rem] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
                  >
                    {social.handle}
                    {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                  </a>
                </li>
              );
            })}
            <li>
              <a
                href={profile.resume.pdf}
                download
                data-fx="download"
                className="footer-link text-[0.85rem] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
              >
                Resume (PDF)
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-6 sm:px-8">
        <p className="text-[0.76rem] text-[var(--text-subtle)]">
          © {year} {profile.name}. All content drawn from his resume.
        </p>
        <p className="text-[0.76rem] text-[var(--text-subtle)]">
          Built with Next.js · assistant grounded in resume data ·{' '}
          {/*
            The way in, for the one person who needs it.

            Quiet on purpose: the same size and colour as the line it sits in,
            no button, no icon, last item in the last row. A recruiter reading
            the footer sees a word; it is not competing with anything.

            It is **not** a security boundary and must never be treated as one.
            Anyone can type `/admin`, and bots scan for it without reading the
            page at all — so hiding the link would protect nothing. What
            protects the panel is TOTP, the rate limiter, the signed HttpOnly
            cookie and the edge middleware, every one of which is in front of
            this URL whether or not anything links to it. The page itself is
            `noindex, nofollow`, which keeps it out of search results; `rel`
            here keeps it out of the crawl that would find it from this page.
          */}
          <Link
            href="/admin"
            rel="nofollow"
            data-testid="admin-entry"
            className="text-[var(--text-subtle)] underline-offset-4 transition-colors hover:text-[var(--text-secondary)] hover:underline"
          >
            Admin
          </Link>
        </p>
      </div>
    </footer>
  );
}
