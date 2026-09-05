'use client';

import { useEffect, useRef, useState } from 'react';
import { fontSets, themes } from '@/data/site';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils/cn';
import type { FontSetId, ThemeId } from '@/types';

/**
 * Appearance controls.
 *
 * One popover holds theme, mode and typography rather than three separate
 * toggles competing for space in the header. On mobile the same component is
 * rendered inline inside the menu sheet, so there is one implementation and
 * one set of behaviours to test.
 */

function usePopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return { open, setOpen, containerRef };
}

const FONT_PREVIEW_CLASS: Record<FontSetId, string> = {
  precision: 'font-sans',
  technical: 'font-mono',
  editorial: 'font-serif',
};

export function AppearanceControls({ variant = 'popover' }: { variant?: 'popover' | 'inline' }) {
  const { theme, mode, font, setTheme, toggleMode, setFont, ready } = useAppearance();
  const { open, setOpen, containerRef } = usePopover();

  const panel = (
    <div className={cn('space-y-5', variant === 'popover' && 'w-[19rem]')}>
      <fieldset>
        <legend className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Theme
        </legend>
        <div className="mt-2.5 space-y-1.5">
          {themes.map((item) => (
            <ThemeOption
              key={item.id}
              id={item.id}
              name={item.name}
              tagline={item.tagline}
              swatch={item.swatch}
              selected={theme === item.id}
              onSelect={setTheme}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Typography
        </legend>
        <div className="mt-2.5 space-y-1.5">
          {fontSets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFont(item.id)}
              aria-pressed={font === item.id}
              data-testid={`font-option-${item.id}`}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors duration-[var(--motion-fast)]',
                font === item.id
                  ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border)]',
              )}
            >
              <span className="min-w-0">
                <span className="block text-[0.82rem] font-medium text-[var(--text-primary)]">
                  {item.name}
                </span>
                <span className="block truncate text-[0.72rem] text-[var(--text-muted)]">
                  {item.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'shrink-0 text-[0.95rem] text-[var(--text-secondary)]',
                  FONT_PREVIEW_CLASS[item.id],
                )}
              >
                Aa
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <span className="text-[0.8rem] text-[var(--text-secondary)]">
          {mode === 'dark' ? 'Dark' : 'Light'} appearance
        </span>
        <button
          type="button"
          onClick={toggleMode}
          role="switch"
          aria-checked={mode === 'dark'}
          aria-label="Toggle dark mode"
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-[var(--motion-base)]',
            mode === 'dark'
              ? 'border-transparent bg-[var(--accent-primary)]'
              : 'border-[var(--border)] bg-[var(--surface-elevated)]',
          )}
        >
          <span
            className={cn(
              'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-[left] duration-[var(--motion-base)] ease-[var(--ease-out)]',
              mode === 'dark'
                ? 'left-6 bg-[var(--accent-contrast)]'
                : 'left-1 bg-[var(--text-secondary)]',
            )}
          />
        </button>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return <div data-testid="appearance-inline">{panel}</div>;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Appearance settings"
        data-testid="appearance-trigger"
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-[0.78rem] text-[var(--text-secondary)]',
          'transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]',
        )}
      >
        <span className="flex items-center gap-1" aria-hidden="true">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--accent-primary)' }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--accent-secondary)' }}
          />
        </span>
        <span className="hidden sm:inline">{ready ? capitalise(theme) : 'Theme'}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Appearance settings"
          data-testid="appearance-panel"
          className="glass animate-fade-in absolute right-0 top-[calc(100%+0.6rem)] z-50 p-4"
        >
          {panel}
        </div>
      ) : null}
    </div>
  );
}

function ThemeOption({
  id,
  name,
  tagline,
  swatch,
  selected,
  onSelect,
}: {
  id: ThemeId;
  name: string;
  tagline: string;
  swatch: readonly [string, string];
  selected: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      data-testid={`theme-option-${id}`}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors duration-[var(--motion-fast)]',
        selected
          ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--border)]',
      )}
    >
      <span aria-hidden="true" className="flex shrink-0 -space-x-1.5">
        <span
          className="h-4 w-4 rounded-full ring-1 ring-black/10"
          style={{ background: swatch[0] }}
        />
        <span
          className="h-4 w-4 rounded-full ring-1 ring-black/10"
          style={{ background: swatch[1] }}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.82rem] font-medium text-[var(--text-primary)]">{name}</span>
        <span className="block truncate text-[0.72rem] text-[var(--text-muted)]">{tagline}</span>
      </span>
    </button>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
