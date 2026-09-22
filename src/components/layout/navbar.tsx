'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppearanceControls } from '@/components/layout/appearance-controls';
import { BulbSwitch } from '@/components/layout/bulb-switch';
import { CommandPalette } from '@/components/search/command-palette';
import { navigation } from '@/data/site';
import { useScrollSpy } from '@/hooks/use-scroll-spy';
import { profile } from '@/data/profile';
import { cn } from '@/lib/utils/cn';

/**
 * Navigation.
 *
 * Transparent at the top of the page, glass once scrolling starts, with a
 * single indicator pill that slides between sections rather than fading in and
 * out under each link — one moving element instead of nine, and the movement
 * itself tells you where you came from.
 *
 * The scroll progress line is driven by a CSS custom property updated inside a
 * `requestAnimationFrame`, so a fast scroll coalesces to one write per frame
 * and never triggers layout.
 */
/**
 * The ids the scroll spy watches, in document order.
 *
 * Declared at module scope rather than inline: the hook takes this as a
 * dependency, and a fresh array literal on every render would disconnect and
 * rebuild the IntersectionObserver on every render.
 *
 * Derived from `navigation` so the two can never drift — a nav item whose
 * anchor is not watched is an item that never lights up.
 */
const SECTION_IDS = navigation.map((item) => item.id);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const pathname = usePathname();

  /*
   * Which item is lit.
   *
   * On the home page the bar is a scroll indicator: the nav items are anchors
   * into one long document, so "current" is a question about scroll position,
   * not about the URL. `useScrollSpy` answers it and the bar advances on its
   * own as the visitor reads — which is the whole point of the one-page
   * layout, and the reason clicking is now optional rather than the only way
   * to move forward.
   *
   * Off the home page — `/assistant`, `/architecture`, a case study — there is
   * nothing to spy on, so the spy is disabled and nothing is marked current.
   * A case study used to light "Projects" by prefix match; it no longer can,
   * because `/#projects` is not a prefix of `/projects/compliance-tracking`.
   * That is honest: on a case study page you are not *in* the projects
   * section, you have left the page it lives on.
   */
  const onHome = pathname === '/';
  const spied = useScrollSpy(SECTION_IDS, onHome);
  const active = onHome ? spied : null;

  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const progressRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  /* ---- Scroll state + progress ------------------------------------ */
  useEffect(() => {
    function read() {
      frameRef.current = null;
      const scrollTop = window.scrollY;
      setScrolled(scrollTop > 12);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, scrollTop / max) : 0;
      progressRef.current?.style.setProperty('--progress', String(ratio));
    }

    function onScroll() {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(read);
    }

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /* ---- Sliding indicator ------------------------------------------- */
  const measure = useCallback(() => {
    if (!active) return;
    const item = itemRefs.current.get(active);
    const list = listRef.current;
    if (!item || !list) return;
    const itemBox = item.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    setIndicator({ left: itemBox.left - listBox.left, width: itemBox.width });
  }, [active]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    // The pill must follow the links when the viewport, the font set or the
    // theme changes their metrics — all of which resize the list.
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  // Route changes close the sheet; leaving it open across a navigation is the
  // classic mobile-nav bug.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /* ---- Mobile menu -------------------------------------------------- */
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-md)] focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--text-primary)] focus:shadow-[var(--shadow-md)]"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'no-print fixed inset-x-0 top-0 z-50 transition-[padding] duration-[var(--motion-base)]',
          scrolled ? 'py-2' : 'py-3.5',
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-[76rem] items-start justify-between gap-4 px-4 sm:px-6"
        >
          <div
            className={cn(
              'nav-pill relative flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[var(--radius-lg)] px-3 py-2 transition-[background,border-color,box-shadow] duration-[var(--motion-base)] sm:px-4',
              // On a page that opens on the dark landing frame the bar needs
              // its own surface from the first pixel, or a light theme's dark
              // text sits on a dark picture. `.nav-over-scene` does that in
              // CSS (via :has), so no route logic is needed here.
              scrolled ? 'glass' : 'border border-transparent',
            )}
          >
            {/* Scroll progress — a hairline that fills as the page advances. */}
            <div
              ref={progressRef}
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-x-3 bottom-0 h-px origin-left overflow-hidden rounded-full transition-opacity duration-[var(--motion-base)] sm:inset-x-4',
                scrolled ? 'opacity-100' : 'opacity-0',
              )}
              style={{
                background: 'var(--gradient-signature)',
                transform: 'scaleX(var(--progress, 0))',
                transformOrigin: 'left',
              }}
            />

            {/* The wordmark is hidden below `sm` and the monogram is decorative,
                so the link needs an explicit name or it is nameless on a phone. */}
            <Link
              href="/"
              aria-label={`${profile.name} — home`}
              className="group flex shrink-0 items-center gap-2.5 rounded-[var(--radius-sm)] text-[0.9rem] font-semibold tracking-tight text-[var(--text-primary)]"
            >
              <span
                aria-hidden="true"
                className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] font-mono text-[0.7rem] text-[var(--accent-primary)] transition-[border-color,box-shadow] duration-[var(--motion-base)] group-hover:border-[var(--accent-primary)] group-hover:shadow-[var(--glow-ring)]"
              >
                AG
              </span>
              <span className="hidden font-display sm:inline">{profile.name}</span>
            </Link>

            <ul ref={listRef} className="relative hidden min-w-0 items-center gap-0 lg:flex">
              {/* One indicator for the whole bar. */}
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute inset-y-0.5 -z-0 rounded-[var(--radius-sm)] transition-[transform,width,opacity] duration-[var(--motion-base)] ease-[var(--ease-out)]',
                  indicator ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                  transform: `translateX(${indicator?.left ?? 0}px)`,
                  width: indicator?.width ?? 0,
                  background:
                    'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                  boxShadow: 'inset 0 -1px 0 0 var(--accent-primary)',
                }}
              />
              {navigation.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    ref={(element) => {
                      if (element) itemRefs.current.set(item.id, element);
                      else itemRefs.current.delete(item.id);
                    }}
                    aria-current={active === item.id ? 'page' : undefined}
                    className={cn(
                      // Item padding is deliberately tight at `lg`: ten primary
                      // links, a wordmark, the appearance control, the AI
                      // button and the lamp all share 1216px, and the list is
                      // the only part that can give. See the header-overflow
                      // test in tests/e2e/responsive.spec.ts — it fails if a
                      // future item pushes this past the bar again.
                      'relative z-10 block whitespace-nowrap rounded-[var(--radius-sm)] px-[0.35rem] py-1.5 text-[0.74rem] transition-colors duration-[var(--motion-fast)] xl:px-2 xl:text-[0.78rem]',
                      active === item.id
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/*
                Search sits here, not inside a section.

                It is one control for the whole site — technologies, projects
                and sections — replacing the two section-level boxes that each
                only knew about their own half. The header is where people look
                for search, and it is the one part of the page that is on screen
                whatever they are reading.

                It shows at every width, phone included: with the section boxes
                gone this is the only way to search, and hiding it behind the
                hamburger would mean searching required two taps and prior
                knowledge of where it went.

                Room was measured before adding it rather than assumed — the bar
                had 135px spare at 1024 and 278px at 1280, against the 36px this
                takes. The nav-overflow test in tests/e2e/responsive.spec.ts is
                what holds that true as items are added.
              */}
              <CommandPalette />
              <div className="hidden sm:block">
                <AppearanceControls />
              </div>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--accent-primary)] px-2.5 py-1 text-[0.72rem] font-medium text-[var(--accent-primary)] transition-[background-color,box-shadow] duration-[var(--motion-fast)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] hover:shadow-[var(--glow-soft)] sm:px-3 sm:py-1.5 sm:text-[0.78rem]"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]"
                />
                <span className="inline sm:hidden">Ask AI</span>
                <span className="hidden sm:inline">Ask my AI</span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                data-testid="menu-toggle"
                className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-secondary)] lg:hidden"
              >
                <span aria-hidden="true" className="relative block h-3 w-4">
                  <span
                    className={cn(
                      'absolute left-0 block h-px w-full bg-current transition-transform duration-[var(--motion-base)]',
                      menuOpen ? 'top-1.5 rotate-45' : 'top-0',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute left-0 top-1.5 block h-px w-full bg-current transition-opacity duration-[var(--motion-fast)]',
                      menuOpen && 'opacity-0',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute left-0 block h-px w-full bg-current transition-transform duration-[var(--motion-base)]',
                      menuOpen ? 'top-1.5 -rotate-45' : 'top-3',
                    )}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* The lamp hangs from the top edge of the page, outside the bar, so
              it reads as a fixture in the room rather than another button. */}
          <div className="-mt-3 w-14 shrink-0 sm:w-16">
            <BulbSwitch />
          </div>
        </nav>
      </header>

      {menuOpen ? (
        <div
          id="mobile-menu"
          data-testid="mobile-menu"
          className="fixed inset-0 z-40 overflow-y-auto bg-[var(--bg-primary)] px-5 pb-10 pt-24 lg:hidden"
        >
          <div className="mb-4">
            <Link
              href="/assistant"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] p-3.5 text-[0.95rem] font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_15%,transparent)]"
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                Ask my AI Assistant
              </span>
              <span>→</span>
            </Link>
          </div>
          <ul className="space-y-1">
            {navigation.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active === item.id ? 'page' : undefined}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3 text-[0.95rem] text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)]"
                >
                  {item.label}
                  <span className="font-mono text-[0.65rem] text-[var(--text-subtle)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-4">
            <AppearanceControls variant="inline" />
          </div>
        </div>
      ) : null}
    </>
  );
}
