'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Which section of a one-page scroll the visitor is currently reading.
 *
 * This is what makes the nav bar advance on its own: the point of the one-page
 * layout is that scrolling moves you through the profile, and the bar is the
 * feedback that says where you have got to. Without it the highlight would sit
 * on "Home" for the entire page, which reads as broken.
 *
 * ## Why `IntersectionObserver` and not a scroll listener
 *
 * A scroll handler fires on every frame of every scroll and has to measure
 * each section with `getBoundingClientRect()` to decide anything — layout
 * reads, in the hot path, on the main thread. The observer is told once which
 * elements to watch and calls back only when one crosses a boundary. On a page
 * this long that is the difference between smooth scrolling and a phone
 * dropping frames.
 *
 * ## The band, and why it is not the whole viewport
 *
 * `rootMargin` shrinks the observation area to a horizontal band across the
 * upper-middle of the screen (`-45%` top, `-50%` bottom). A section counts as
 * "current" when it crosses that band, not when it is merely visible — with
 * the full viewport, two or three sections are visible at once on a desktop
 * and the highlight flickers between them as you scroll. A narrow band has
 * exactly one occupant almost always, which is what a highlight needs.
 *
 * The band sits above centre because that is where the eye reads. A band at
 * the exact middle marks a section as current only once you are halfway
 * through it, which feels a beat late.
 *
 * ## The two edges
 *
 * At the very top of the page nothing has crossed the band yet, and at the
 * very bottom the last section may be too short to reach it. Both are handled
 * explicitly rather than left to whatever the observer last reported: the
 * first id wins at the top, the last id wins once the page is scrolled to the
 * end. Otherwise "Contact" is a nav item that can never light up on a tall
 * screen — which is exactly the sort of thing that passes every test and is
 * obviously wrong the moment a person scrolls to the bottom.
 */
export function useScrollSpy(ids: readonly string[], enabled = true): string | null {
  const [active, setActive] = useState<string | null>(null);
  // Written by the observer, read by the scroll handler that resolves the two
  // edges. A ref rather than state: it changes on every intersection and no
  // render depends on it directly.
  const visible = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setActive(null);
      return;
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    visible.current = new Set();

    function resolve() {
      const doc = document.documentElement;

      // Bottom of the page: the last section wins whether or not it is tall
      // enough to reach the band. 2px of slack because fractional device
      // pixels mean the arithmetic rarely lands exactly on zero.
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) {
        const last = ids[ids.length - 1];
        if (last) setActive(last);
        return;
      }

      // Top of the page, before anything has crossed the band.
      if (window.scrollY < 8) {
        const first = ids[0];
        if (first) setActive(first);
        return;
      }

      // Otherwise: whichever watched section is in the band, in document
      // order, so a boundary crossing never picks the one behind.
      for (const id of ids) {
        if (visible.current.has(id)) {
          setActive(id);
          return;
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.current.add(entry.target.id);
          else visible.current.delete(entry.target.id);
        }
        resolve();
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    for (const el of elements) observer.observe(el);

    // The observer alone cannot see "you are now at the very bottom" — no
    // boundary is crossed by the last few hundred pixels of scroll — so the
    // edges need a scroll listener too. It is passive and does no layout
    // reads of its own, which is what keeps it off the critical path.
    window.addEventListener('scroll', resolve, { passive: true });
    resolve();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', resolve);
    };
  }, [ids, enabled]);

  return active;
}
