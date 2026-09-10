'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { groupOf, skillNotes, usedIn } from '@/data/skill-notes';
import { cn } from '@/lib/utils/cn';

/**
 * Tap a technology, read what it actually is.
 *
 * A chip that says "Redshift" tells a recruiter nothing they can use unless
 * they already know what Redshift is. This turns each chip into a short,
 * honest explainer: what the tool is, why it gets picked for this kind of
 * work, and — computed rather than written — which of the case studies list
 * it.
 *
 * ## Why the native `<dialog>`
 *
 * `showModal()` gives, for free and correctly: a focus trap, Escape to close,
 * the top layer (so nothing on the page can paint over it or clip it), inert
 * background content, `aria-modal` semantics, and focus returned to the
 * element that opened it. A hand-rolled modal has to reimplement every one of
 * those, and portfolios are exactly where the last two get skipped.
 *
 * The one thing it does not give is dismissal by clicking outside, because the
 * backdrop is a pseudo-element and not a click target of its own. That is
 * handled below by checking whether the click landed outside the panel's own
 * box — which is a hit test, not a guess based on `event.target`.
 *
 * ## Why one dialog and not one per chip
 *
 * Thirty-four chips would otherwise mean thirty-four dialog elements in the
 * DOM. A provider holds a single dialog and the chips set which skill it
 * shows, so the cost is one element regardless of how many chips a page has.
 */

interface ExplainerContext {
  open: (skill: string) => void;
}

const Ctx = createContext<ExplainerContext | null>(null);

export function SkillExplainerProvider({ children }: { children: ReactNode }) {
  /*
   * A nested provider is a no-op.
   *
   * `SkillsSection` mounts one so it works standalone, and the home page
   * mounts one around everything — which used to give the document *two*
   * `<dialog data-testid="skill-explainer">` elements. Chips outside the inner
   * provider opened one dialog and chips inside opened the other, `getByTestId`
   * matched two elements, and a duplicated test id is the mildest symptom of
   * two modals fighting over the top layer.
   *
   * Rendering only the children when a provider is already above us keeps both
   * call sites honest: the outermost one owns the single dialog, and the inner
   * one costs nothing.
   */
  const parent = useContext(Ctx);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [skill, setSkill] = useState<string | null>(null);

  const open = useCallback((next: string) => {
    setSkill(next);
    // showModal() must be called after the content exists, or the dialog opens
    // empty for a frame. The state set above and this call are batched, and the
    // element is already mounted, so the content is there when it paints.
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // `close` fires for Escape as well as for the button, so clearing state here
  // covers every route out of the dialog rather than just the ones with a
  // handler attached.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setSkill(null);
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  const onBackdropClick = useCallback((event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = event.currentTarget;
    // The backdrop is a pseudo-element, so a click on it targets the dialog
    // itself. Comparing against the panel's own box is the reliable test —
    // `event.target === dialog` also fires for clicks on padding.
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) dialog.close();
  }, []);

  const note = skill ? skillNotes[skill] : undefined;
  const projects = skill ? usedIn(skill) : [];
  const group = skill ? groupOf(skill) : undefined;

  if (parent) return <>{children}</>;

  return (
    <Ctx.Provider value={{ open }}>
      {children}

      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-labelledby="skill-explainer-title"
        data-testid="skill-explainer"
        className="skill-dialog surface-card w-[min(34rem,calc(100vw-2rem))] p-0"
      >
        {skill ? (
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {group ? (
                  <p className="font-mono text-[0.64rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
                    {group}
                  </p>
                ) : null}
                <h2
                  id="skill-explainer-title"
                  className="mt-1.5 font-display text-[1.35rem] leading-tight"
                >
                  {skill}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                data-testid="skill-explainer-close"
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
              >
                <span aria-hidden="true" className="text-[1rem] leading-none">
                  ×
                </span>
              </button>
            </div>

            {note ? (
              <>
                <section className="mt-5">
                  <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                    What it is
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                    {note.what}
                  </p>
                </section>

                <section className="mt-5">
                  <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                    Why it gets used
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                    {note.why}
                  </p>
                </section>
              </>
            ) : (
              <p className="mt-5 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                No note has been written for this one yet.
              </p>
            )}

            <section className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                Where Arvind used it
              </h3>
              {projects.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.id}`}
                        onClick={close}
                        className="group inline-flex items-start gap-2 text-[0.88rem] leading-snug text-[var(--accent-primary)] hover:underline"
                      >
                        <Icon
                          name="check"
                          size={14}
                          className="mt-1 shrink-0 text-[var(--accent-secondary)]"
                        />
                        {project.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                /* Deliberately not filled with something plausible. This half
                   is read off the case studies; when they do not name the
                   technology, saying so is the honest answer. */
                <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
                  It is part of the stack, but none of the written case studies name it. Rather
                  than invent a project for it, this says nothing more.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </dialog>
    </Ctx.Provider>
  );
}

/**
 * A technology chip that opens the explainer.
 *
 * It is a `button`, not a styled `span` with a click handler — so it is in the
 * tab order, responds to Enter and Space, and announces itself as something
 * that does a thing.
 */
export function SkillChip({
  skill,
  className,
  highlighted = false,
}: {
  skill: string;
  className?: string;
  highlighted?: boolean;
}) {
  const context = useContext(Ctx);

  // Without a provider the chip degrades to plain text rather than throwing.
  // Nothing on the page should break because a section forgot the wrapper.
  if (!context) {
    return <span className={className}>{skill}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => context.open(skill)}
      data-testid={`skill-chip-${skill}`}
      className={cn(
        'cursor-pointer text-left transition-[border-color,color,background-color] duration-[var(--motion-fast)]',
        highlighted
          ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] text-[var(--accent-primary)]'
          : 'hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]',
        className,
      )}
    >
      {skill}
    </button>
  );
}
