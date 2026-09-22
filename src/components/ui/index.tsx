'use client';

import { forwardRef, Fragment, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils/cn';

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent-primary)] text-[var(--accent-contrast)] border border-transparent hover:brightness-110 shadow-[0_6px_24px_-12px_var(--accent-glow)]',
  secondary:
    'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent-primary)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border)]',
  quiet:
    'bg-transparent text-[var(--text-secondary)] border border-transparent hover:text-[var(--accent-primary)]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-[0.8125rem] px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-[0.95rem] px-5 py-3 gap-2',
};

/** The classes a LinkButton of this variant and size carries — for the few
 *  buttons (the download button) that need their own component. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return cn(
    'fx-btn group clay-control inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium',
    'transition-[background-color,border-color,color,transform,filter,box-shadow] duration-[var(--motion-fast)]',
    'active:translate-y-px',
    variant === 'primary' && 'clay-control-primary',
    VARIANTS[variant],
    SIZES[size],
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'fx-btn inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium',
        'transition-[background-color,border-color,color,transform,filter] duration-[var(--motion-fast)]',
        'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Link button (anchor styled as a button)                             */
/* ------------------------------------------------------------------ */

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  download,
  target,
  rel,
  magnetic,
  fx,
  'aria-label': ariaLabel,
}: {
  href: string;
  /** A slight pull towards the cursor. For the few primary calls to action only. */
  magnetic?: boolean;
  /**
   * The click animation (see click-effects.tsx). Worked out from the link when
   * left out: a download gets `download`, `mailto:` gets `mail`, `tel:` gets
   * `call`, a WhatsApp link gets `whatsapp`, and anything else gets the ripple.
   */
  fx?: 'download' | 'mail' | 'call' | 'whatsapp' | 'hello' | 'browser' | 'ripple';
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  download?: boolean | string;
  target?: string;
  rel?: string;
  'aria-label'?: string;
}) {
  const effect =
    fx ??
    (download !== undefined
      ? 'download'
      : /^mailto:/i.test(href)
        ? 'mail'
        : /^tel:/i.test(href)
          ? 'call'
          : /wa\.me|whatsapp/i.test(href)
            ? 'whatsapp'
            : target === '_blank'
              ? 'browser'
              : 'ripple');
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      data-fx={effect}
      {...(magnetic ? { 'data-magnetic': '' } : {})}
      {...(download !== undefined ? { download } : {})}
      {...(target ? { target } : {})}
      {...(rel ? { rel } : target === '_blank' ? { rel: 'noopener noreferrer' } : {})}
      className={cn(
        /* `clay-control` is a hook, not a style: in every theme but Clay it
           matches nothing. It is what lets the Clay theme give this button a
           54px height, an 18px radius and coral-keyed depth without a second
           button component or a theme prop threaded through every call site. */
        'fx-btn group clay-control inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium',
        'transition-[background-color,border-color,color,transform,filter,box-shadow] duration-[var(--motion-fast)]',
        'active:translate-y-px',
        variant === 'primary' && 'clay-control-primary',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'muted';
  className?: string;
}) {
  const tones = {
    neutral:
      'border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
    accent:
      'border-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_9%,transparent)] text-[var(--accent-primary)]',
    success:
      'border-[color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color-mix(in_srgb,var(--success)_9%,transparent)] text-[var(--success)]',
    muted: 'border-transparent bg-transparent text-[var(--text-muted)]',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* SplitText — per-character reveal                                    */
/* ------------------------------------------------------------------ */

/**
 * Splits a string into spans so each character can rise independently.
 *
 * The string stays in the accessibility tree once, as real text in a
 * visually-hidden span, with the animated character spans marked
 * `aria-hidden`. An `aria-label` on the wrapper would be simpler but is
 * invalid: a plain `span` has no role, and ARIA forbids naming a generic
 * element — axe flags it, and support across screen readers is inconsistent.
 *
 * Delay is a CSS custom property rather than an inline `animation-delay`, so
 * the stagger step can be retuned in one place in the stylesheet, and the
 * whole effect collapses to nothing under `prefers-reduced-motion`.
 */
export function SplitText({
  text,
  className,
  offsetMs = 0,
  as: Tag = 'span',
  announce = true,
}: {
  text: string;
  className?: string;
  offsetMs?: number;
  as?: 'span' | 'h1' | 'h2';
  /**
   * Set false when the caller supplies its own accessible text — e.g. a name
   * split across two coloured halves, where two separate hidden spans would
   * read as "ArvindGupta" with no space.
   */
  announce?: boolean;
}) {
  let index = 0;
  return (
    <Tag
      className={cn('char-rise', className)}
      style={{ ['--char-offset' as string]: `${offsetMs}ms` }}
    >
      {announce ? <span className="sr-only">{text}</span> : null}
      {text.split(' ').map((word, wordIndex, words) => (
        <span
          key={`${word}-${wordIndex}`}
          aria-hidden="true"
          className="inline-block whitespace-nowrap"
        >
          {Array.from(word).map((character) => {
            const currentIndex = index++;
            return (
              <span
                key={`${character}-${currentIndex}`}
                className="char"
                style={{ ['--char-index' as string]: currentIndex }}
              >
                {character}
              </span>
            );
          })}
          {wordIndex < words.length - 1 ? (
            <span className="char" style={{ ['--char-index' as string]: index++ }}>
              {'\u00A0'}
            </span>
          ) : null}
        </span>
      ))}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal — viewport entrance animation                                */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
}: {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'li' | 'section' | 'article' | 'header';
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', className)}
      data-visible={inView ? 'true' : 'false'}
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Section scaffolding                                                 */
/* ------------------------------------------------------------------ */

export function Section({
  id,
  children,
  className,
  ariaLabel,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn('relative mx-auto w-full max-w-[76rem] px-5 py-20 sm:px-8 md:py-28', className)}
    >
      {children}
    </section>
  );
}

/**
 * Words that rise into place one after another as the line scrolls into view.
 *
 * Each word is its own inline-block span, driven by a CSS view timeline (see
 * SPLIT WORDS in globals.css). There is no JavaScript. The spaces are real
 * text nodes between the spans, so the accessible name and copy-paste read
 * exactly like the plain string. Without scroll timelines, or under reduced
 * motion, the words are simply there.
 */
export function SplitWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={cn('split-words', className)}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="split-word" style={{ ['--w' as string]: index }}>
            {word}
          </span>
          {index < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[var(--accent-primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[clamp(1.65rem,4.2vw,2.6rem)]">
        <SplitWords text={title} />
      </h2>
      {description ? (
        <p className="mt-4 text-[0.98rem] leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
