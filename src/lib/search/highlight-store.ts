'use client';

import { useSyncExternalStore } from 'react';

/**
 * The one piece of state the palette has to hand to a section it does not own.
 *
 * ## The problem
 *
 * Picking a technology in the palette scrolls to the stack and highlights the
 * chip. The palette lives in the header; the chips live in a section several
 * levels down a different branch of the tree. There is no common ancestor
 * holding state, and the two are rendered by different client components.
 *
 * ## Why not the URL
 *
 * A query string (`/?tech=Redshift#skills`) survives in browser history, in
 * whatever someone copies out of the address bar, and in any link they share —
 * long after the highlight meant anything. It also makes one page look like
 * many to a crawler, which is the mistake `sitemapRoutes` already exists to
 * avoid.
 *
 * ## Why not context
 *
 * A provider would have to wrap the whole document to sit above both the header
 * and the sections, and every consumer of that context re-renders on every
 * keystroke in the palette. `useSyncExternalStore` subscribes only the two
 * components that actually read the term, and React's own tearing guarantees
 * come with it.
 *
 * ## Why it is a term and not an id
 *
 * The same word can legitimately match chips in more than one group — "SQL"
 * appears under Programming and inside "MS SQL Server" under Databases — and
 * highlighting one of them while leaving its twin dark would read as a bug.
 */
let term = '';
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setHighlightTerm(next: string) {
  const value = next.trim();
  if (value === term) return;
  term = value;
  emit();
}

export function clearHighlightTerm() {
  setHighlightTerm('');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return term;
}

/*
 * The server snapshot is a separate function returning a constant, not
 * `getSnapshot`. On the server there is no visitor and no highlight, and
 * handing React a value that could differ between the render and the hydration
 * is what produces a hydration mismatch nobody can reproduce locally.
 */
function getServerSnapshot() {
  return '';
}

export function useHighlightTerm(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Test seam: module state outlives a single test without it. */
export function resetHighlightTermForTests() {
  term = '';
  listeners.clear();
}
