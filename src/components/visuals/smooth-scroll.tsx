'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { siteSettings } from '@/data/site-settings';

/**
 * Smooth wheel scrolling with Lenis (CHANGE-013).
 *
 * A mouse wheel moves the page in steps of about 100px, so the pinned scroll
 * scenes (landing, mission, build) advance in visible jerks. Lenis eases each
 * step. It moves the real scroll position rather than faking it with a
 * transform, so every CSS scroll timeline, `position: sticky`, the scroll spy
 * and the anchor links keep working unchanged.
 *
 * It is on only where it helps and never where it hurts:
 *
 * - Desktop with a mouse or trackpad only (`hover` and a fine pointer).
 *   Phones already scroll smoothly by touch, so they keep native scrolling.
 * - Off under reduced motion, using the same two-part check as the rest of the
 *   site. It is also off on `/admin`, where the forms are long and a precise
 *   native scroll is more useful.
 * - Scrollable areas inside the page (the skill popup, the assistant, the
 *   search palette, the mobile menu) scroll natively (`allowNestedScroll`).
 * - Anchor links (`#projects` and the like) glide to their section and
 *   respect each section's `scroll-margin`.
 * - Off entirely when "Smooth scrolling" is unticked on the admin Site
 *   defaults tab.
 *
 * The library is about 4 kB and loads only on desktop, after the page is
 * interactive, through a dynamic import.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const onAdmin = pathname?.startsWith('/admin') ?? false;

  useEffect(() => {
    if (!siteSettings.smoothScroll || onAdmin) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches) return;
    if (reduced.matches && document.documentElement.dataset.motion !== 'full') return;

    let lenis: { destroy: () => void } | null = null;
    let cancelled = false;
    void import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({
        lerp: 0.12,
        wheelMultiplier: 1,
        smoothWheel: true,
        autoRaf: true,
        anchors: true,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
      });
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, [onAdmin]);

  return null;
}
