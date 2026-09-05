'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which section is currently in the viewport so the navigation can
 * indicate position. One observer for all sections; no scroll listener, so no
 * per-frame work on the main thread.
 */
export function useActiveSection(sectionIds: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(sectionIds[0] ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}
