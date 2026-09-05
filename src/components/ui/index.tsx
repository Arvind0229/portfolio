'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
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
        'inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium',
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
  'aria-label': ariaLabel,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  download?: boolean | string;
  target?: string;
  rel?: string;
  'aria-label'?: string;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      {...(download !== undefined ? { download } : {})}
      {...(target ? { target } : {})}
      {...(rel ? { rel } : target === '_blank' ? { rel: 'noopener noreferrer' } : {})}
      className={cn(
        'group inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium',
        'transition-[background-color,border-color,color,transform,filter] duration-[var(--motion-fast)]',
        'active:translate-y-px',
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
      <h2 className="mt-3 text-[clamp(1.65rem,4.2vw,2.6rem)]">{title}</h2>
      {description ? (
        <p className="mt-4 text-[0.98rem] leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
