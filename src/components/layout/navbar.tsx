'use client';

import { useEffect, useState } from 'react';
import { AppearanceControls } from '@/components/layout/appearance-controls';
import { navigation } from '@/data/site';
import { profile } from '@/data/profile';
import { useActiveSection } from '@/hooks/use-active-section';
import { cn } from '@/lib/utils/cn';

const SECTION_IDS = navigation.map((item) => item.id);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);

  useEffect(() => {
    // Passive listener + a boolean flip: no layout reads, no per-frame work.
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
          className={cn(
            'mx-auto flex max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-6',
          )}
        >
          <div
            className={cn(
              'flex w-full items-center justify-between gap-4 rounded-[var(--radius-lg)] px-3 py-2 transition-[background,border-color,box-shadow] duration-[var(--motion-base)] sm:px-4',
              scrolled ? 'glass' : 'border border-transparent',
            )}
          >
            {/* The wordmark is hidden below `sm` and the monogram is decorative,
                so the link needs an explicit name or it is nameless on a phone. */}
            <a
              href="#top"
              aria-label={`${profile.name} — back to top`}
              className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] text-[0.9rem] font-semibold tracking-tight text-[var(--text-primary)]"
            >
              <span
                aria-hidden="true"
                className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] font-mono text-[0.7rem] text-[var(--accent-primary)]"
              >
                AG
              </span>
              <span className="hidden sm:inline">{profile.name}</span>
            </a>

            <ul className="hidden items-center gap-0.5 lg:flex">
              {navigation.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    aria-current={active === item.id ? 'true' : undefined}
                    className={cn(
                      'relative rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[0.8rem] transition-colors duration-[var(--motion-fast)]',
                      active === item.id
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-2.5 -bottom-0.5 h-px origin-left transition-transform duration-[var(--motion-base)] ease-[var(--ease-out)]',
                        active === item.id ? 'scale-x-100' : 'scale-x-0',
                      )}
                      style={{ background: 'var(--accent-primary)' }}
                    />
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <AppearanceControls />
              </div>
              <a
                href="#assistant"
                className="hidden items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--accent-primary)] px-3 py-1.5 text-[0.78rem] font-medium text-[var(--accent-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] md:inline-flex"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]"
                />
                Ask my AI
              </a>
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
        </nav>
      </header>

      {menuOpen ? (
        <div
          id="mobile-menu"
          data-testid="mobile-menu"
          className="fixed inset-0 z-40 overflow-y-auto bg-[var(--bg-primary)] px-5 pb-10 pt-20 lg:hidden"
        >
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3 text-[0.95rem] text-[var(--text-primary)]"
                >
                  {item.label}
                </a>
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
