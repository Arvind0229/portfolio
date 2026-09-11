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
  /*
   * These defaults are tuned for a thumb, not for a mouse wheel.
   *
   * They used to be `threshold: 0.15` with `rootMargin: '0px 0px -8% 0px'` — a
   * root *shrunk* at the bottom, so an element only began its 620ms fade once
   * 15% of it had pushed past a line above the fold. Reading slowly on a
   * desktop that looks considered. On a phone, a flick covers a couple of
   * thousand pixels a second down a page that is 25,000 pixels tall, and the
   * element is still fading in as it leaves the screen. Scroll back up and you
   * meet it mid-animation — or before its delay has elapsed — which is exactly
   * the "sections come back blank" report.
   *
   * Measured: with a slow scroll all 91 reveals completed and stayed complete.
   * With a fast one, elements sat at opacity 0, 0.39, 0.78 while on screen. The
   * mechanism was never broken; it was simply slower than the user.
   *
   * So the root is now *expanded* by 300px top and bottom, and any intersection
   * at all counts. An element begins its entrance while it is still off-screen
   * and has finished by the time it is read — in both directions, which is what
   * makes scrolling back up behave.
   */
  const { threshold = 0, rootMargin = '300px 0px 300px 0px', once = true } = options ?? {};
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
