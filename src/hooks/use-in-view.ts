'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Viewport reveal.
 *
 * Deliberately built on IntersectionObserver rather than an animation library.
 * A scroll-reveal is one observer and one CSS class; importing ~30 KB of
 * runtime to express that would cost more than it delivers, and the CSS
 * keyframes hand off cleanly to the compositor.
 *
 * Elements unobserve after their first reveal — a section does not need to be
 * watched for the rest of the visit.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const { threshold = 0.15, rootMargin = '0px 0px -8% 0px', once = true } = options ?? {};
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No observer support (or a reduced-motion visitor) — show it immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
