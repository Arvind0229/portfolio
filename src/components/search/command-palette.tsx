'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { searchAll, type SearchEntry, type SearchKind } from '@/lib/search/entries';
import { setHighlightTerm } from '@/lib/search/highlight-store';
import { cn } from '@/lib/utils/cn';

/**
 * One search for the whole site.
 *
 * ## What it replaced, and why
 *
 * There were two search boxes: one above the technology chips, one above the
 * project cards. Arvind's objection was the right one — two boxes for one verb
 * means the visitor has to guess which half of the site a word lives in before
 * they can look for it. Worse, each box only ever admitted to knowing about its
 * own section, so typing "Redshift" into the projects box returned nothing and
 * quietly implied he had never touched it.
 *
 * This is one control, in the one place a person looks for search, that knows
 * about technologies, projects and sections at once.
 *
 * ## Shape
 *
 * Collapsed it is an icon. It opens into a field over a dimmed page rather than
 * expanding in place, because the results need somewhere to go: a field that
 * grows sideways in the header has nowhere to put ten rows, and a dropdown
 * hanging off a fixed header is clipped the moment the viewport is short.
 *
 * ## Keyboard
 *
 * ⌘K / Ctrl-K, or `/` on its own — the two conventions people already have in
 * their fingers. `/` is ignored while a field has focus, or typing the word
 * "and/or" into the assistant would open a search box mid-sentence.
 *
 * Arrows move, Enter goes, Escape closes, and focus returns to the button that
 * opened it. That last part is the one most implementations skip: without it a
 * keyboard visitor closes the palette and lands back at the top of the
 * document, having lost their place entirely.
 */
const KIND_LABEL: Record<SearchKind, string> = {
  technology: 'Technology',
  project: 'Project',
  section: 'Go to',
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const hits = useMemo(() => searchAll(query), [query]);

  // The portal target only exists in the browser. Rendering it on the server
  // and hoping is the standard way to get a hydration error here.
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setCursor(0);
    triggerRef.current?.focus();
  }, []);

  /* ---- Global shortcuts ------------------------------------------- */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---- Open / close side effects ----------------------------------- */
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // A new query means a new list; leaving the cursor where it was points it at
  // whatever happens to be in that slot now.
  useEffect(() => setCursor(0), [query]);

  const go = useCallback(
    (entry: SearchEntry) => {
      /*
       * A technology is not a destination on its own — it is a word to find in
       * the stack. Set it before navigating so the chips are already marked by
       * the time the scroll lands, rather than lighting up a beat later.
       */
      if (entry.kind === 'technology') setHighlightTerm(entry.title);
      else setHighlightTerm('');

      close();

      const hash = entry.href.startsWith('/#') ? entry.href.slice(2) : null;
      if (!hash) {
        router.push(entry.href);
        return;
      }

      const target = document.getElementById(hash);
      if (!target) {
        // Not on the home page: let the router carry the fragment instead of
        // scrolling to an element that is not in this document.
        router.push(entry.href);
        return;
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    },
    [close, router],
  );

  function onFieldKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (hits.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((value) => (value + 1) % hits.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((value) => (value - 1 + hits.length) % hits.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const hit = hits[cursor];
      if (hit) go(hit.entry);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Search the site"
        data-testid="site-search-open"
        /*
          Hydration, stated out loud.

          The ⌘K / `/` shortcuts are a `document` listener attached in an
          effect, so they do not exist until this component hydrates — the
          button is in the server HTML a moment before the keyboard works. A
          person never notices; a test pressing the key on load does, and one
          did, failing at a single viewport and looking like a flake.

          So the component says when it is live rather than the test guessing
          with a sleep. One attribute, no behaviour attached to it.
        */
        data-ready={mounted ? 'true' : undefined}
        title="Search  (Ctrl K)"
        className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-secondary)] transition-[color,border-color,box-shadow] duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:shadow-[var(--glow-ring)]"
      >
        <Icon name="search" size={16} aria-hidden="true" />
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="search-overlay fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]"
              data-testid="site-search-overlay"
            >
              {/* The scrim closes on click, and is inert to a screen reader —
                  Escape is the equivalent there, and an announced "button" with
                  no name is worse than nothing. */}
              <div
                aria-hidden="true"
                onClick={close}
                className="absolute inset-0 bg-[color-mix(in_srgb,var(--bg-primary)_78%,transparent)] backdrop-blur-sm"
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-label="Search"
                className="search-panel glass-elevated relative w-full max-w-[34rem] overflow-hidden rounded-[var(--radius-lg)]"
              >
                <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4">
                  <Icon
                    name="search"
                    size={17}
                    aria-hidden="true"
                    className="shrink-0 text-[var(--text-subtle)]"
                  />
                  <input
                    ref={inputRef}
                    /*
                      `type="text"`, not `type="search"`: the search type draws
                      a browser clear button in a style no theme here can reach,
                      and on iOS it reserves space the placeholder then has to
                      fit around — which is exactly how the old field ended up
                      clipping its own placeholder on a phone.
                    */
                    type="text"
                    role="combobox"
                    aria-expanded
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={hits[cursor] ? `${listId}-${cursor}` : undefined}
                    aria-label="Search projects, technologies and sections"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={onFieldKeyDown}
                    placeholder="Search projects, tech, sections…"
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="site-search"
                    className="w-full bg-transparent py-4 text-[0.95rem] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)]"
                  />
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close search"
                    data-testid="site-search-close"
                    className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 font-mono text-[0.62rem] uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Esc
                  </button>
                </div>

                {query.trim().length === 0 ? (
                  <p className="px-4 py-6 text-[0.85rem] text-[var(--text-muted)]">
                    Type a technology, a project or a section. Try{' '}
                    <span className="font-mono text-[var(--text-secondary)]">Power BI</span>,{' '}
                    <span className="font-mono text-[var(--text-secondary)]">compliance</span> or{' '}
                    <span className="font-mono text-[var(--text-secondary)]">contact</span>.
                  </p>
                ) : hits.length === 0 ? (
                  <p
                    className="px-4 py-6 text-[0.85rem] text-[var(--text-secondary)]"
                    data-testid="site-search-empty"
                  >
                    Nothing here matches “{query.trim()}”. That is not a claim he could not
                    learn it — it is a claim the resume cannot make.
                  </p>
                ) : (
                  <ul
                    id={listId}
                    role="listbox"
                    aria-label="Search results"
                    data-testid="site-search-results"
                    className="max-h-[52vh] overflow-y-auto py-1.5"
                  >
                    {hits.map((hit, index) => (
                      <li key={hit.entry.id}>
                        <button
                          type="button"
                          id={`${listId}-${index}`}
                          role="option"
                          aria-selected={index === cursor}
                          // Pointer selection moves the cursor rather than
                          // running a second highlight mechanism beside it, so
                          // mouse and keyboard can never disagree about which
                          // row Enter would take.
                          onPointerMove={() => setCursor(index)}
                          onClick={() => go(hit.entry)}
                          data-testid={`site-search-hit-${hit.entry.id}`}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-[var(--motion-fast)]',
                            index === cursor
                              ? 'bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)]'
                              : 'bg-transparent',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="w-[4.6rem] shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-subtle)]"
                          >
                            {KIND_LABEL[hit.entry.kind]}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.9rem] text-[var(--text-primary)]">
                              {hit.entry.title}
                            </span>
                            <span className="block truncate text-[0.75rem] text-[var(--text-muted)]">
                              {hit.entry.detail}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              'shrink-0 text-[var(--accent-primary)] transition-opacity',
                              index === cursor ? 'opacity-100' : 'opacity-0',
                            )}
                          >
                            ↵
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
