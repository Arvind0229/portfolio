'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils/cn';

/**
 * Search, as an icon that opens into a field.
 *
 * ## Why it changed shape
 *
 * It used to be a permanently-open input sitting between two grids of cards,
 * left-aligned with nothing beside it — a box with no evident owner, which is
 * exactly how Arvind described it. A control that is always open claims the
 * space of a primary action while being a secondary one: most people read the
 * groups, and only a recruiter with a job description in hand types a word.
 *
 * Collapsed to an icon it takes the space its importance deserves, and opening
 * it is a deliberate act that puts the cursor where the person is already
 * looking.
 *
 * ## The part that is easy to get wrong
 *
 * A collapsing search is usually built as a `div` that swaps to an `input`, and
 * that version cannot be reached by keyboard and announces nothing. Here the
 * collapsed state is a real `button` with a real label, the expanded state is a
 * real `input` with a real `<label>`, focus is moved deliberately on open, and
 * Escape closes it. The animation is width only — an element that is present
 * either way, not content appearing out of nothing.
 *
 * ## Closing
 *
 * It collapses on blur **only when empty**. Closing a field that still has a
 * query in it would throw away the filter the person is looking at the results
 * of, which is the kind of helpfulness nobody asks for twice.
 */
export function SkillSearch({
  value,
  onChange,
  resultCount,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  resultCount: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const id = useId();

  // Focus after the state change has painted the input, not before it exists.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    onChange('');
    setOpen(false);
  }

  return (
    <div className={cn('flex items-center justify-end', className)}>
      {/*
        Both states live in the DOM; `hidden` swaps them. Rendering one and
        unmounting the other would lose the input's own state on every toggle
        and give assistive technology a control that vanishes rather than one
        that changes.
      */}
      <button
        type="button"
        hidden={open}
        onClick={() => setOpen(true)}
        data-testid="skill-search-open"
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.82rem] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
      >
        <Icon name="search" size={16} aria-hidden="true" />
        {/* The word is here for a pointer user who has never met this pattern,
            and gone below `sm` where the row is tight and the icon is enough. */}
        <span className="hidden sm:inline">Search</span>
        <span className="sr-only sm:hidden">Search the technology stack</span>
      </button>

      <div
        hidden={!open}
        /*
          `w-full` on a phone, a fixed width above it.

          The old field carried `min-w-[15rem]` — 240px — which on a 320px
          screen left the placeholder clipped inside a box that could not
          shrink. Arvind reported exactly that. Full width on small screens
          means the field is as wide as there is room for and the placeholder
          always fits; the row it sits in wraps to give it that room.
        */
        className="skill-search-field w-full sm:w-[17rem]"
      >
        <label htmlFor={id} className="sr-only">
          Search the technology stack
        </label>
        <div className="relative">
          <Icon
            name="search"
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
          />
          <input
            ref={inputRef}
            id={id}
            /*
              `type="text"`, not `type="search"`. The search type adds a
              browser-drawn clear button that sits on top of the one below, in
              a style no theme here can reach, and on iOS it reserves space the
              placeholder then has to fit around.
            */
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close();
            }}
            onBlur={() => {
              if (!value.trim()) setOpen(false);
            }}
            placeholder="Search a technology…"
            data-testid="skill-search"
            autoComplete="off"
            className="w-full rounded-[var(--radius-md)] border border-[var(--accent-primary)] bg-[var(--surface)] py-2 pl-9 pr-9 text-[0.85rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:outline-offset-2"
          />
          {value ? (
            <button
              type="button"
              onClick={close}
              data-testid="skill-search-clear"
              aria-label="Clear the search"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Announced, not drawn: a sighted user sees the grid change. */}
      <p className="sr-only" role="status" aria-live="polite">
        {resultCount} technologies shown
      </p>
    </div>
  );
}
