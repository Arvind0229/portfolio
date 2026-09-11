'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils/cn';

/**
 * The bulb.
 *
 * The dark/light control is a pendant lamp on a cord. Click the bulb, pull the
 * cord, or focus it and press Enter — the cord tightens, the bulb swings, the
 * filament lights or dies, and the whole page changes environment with it.
 *
 * Three things make this a real control rather than a decoration:
 *
 *   1. It is a `button` with `role="switch"` and `aria-checked`, so a screen
 *      reader announces "Lights, on/off" and a keyboard operates it normally.
 *      The physicality is presentation layered on a standard widget.
 *   2. Pointer dragging is progressive enhancement. The pull gesture is nice,
 *      but nothing depends on it: click and keyboard do the same job.
 *   3. Under `prefers-reduced-motion` the swing and cord stretch do not run.
 *      The bulb still lights, because that is the state, not the animation.
 *
 * The swing is a CSS keyframe on a transform, so it composites off the main
 * thread. Drag tracking writes one custom property per frame and nothing else.
 */

const PULL_THRESHOLD_PX = 18;
const SWING_MS = 900;

export function BulbSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, setMode, ready } = useAppearance();
  const [swinging, setSwinging] = useState(false);
  // Increments on every click. Used as a React `key`, so the cord and bulb
  // remount and their animation restarts from frame zero every single time —
  // see the note at the click handler.
  const [yankKey, setYankKey] = useState(0);
  const [pull, setPull] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const swingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDark = mode === 'dark';

  const toggle = useCallback(() => {
    const next = isDark ? 'light' : 'dark';

    // The wash is a one-shot element rather than a permanent overlay: it is
    // mounted, it plays, it is removed. Nothing stays in the tree costing
    // compositor work after the transition ends.
    if (typeof document !== 'undefined') {
      /*
       * Both halves of the preference, not just the OS half.
       *
       * This used to read `matchMedia('(prefers-reduced-motion: reduce)')`
       * alone, which made the appearance panel's "Turn animation on" a lie for
       * this one control: the CSS honoured the override — the whole
       * reduced-motion block is nested under `:root:not([data-motion='full'])`
       * — but the click handler never started the animation in the first
       * place, so there was nothing for the CSS to allow. Arvind reported the
       * pull working on his phone and dead on his desktop, and this is why:
       * Windows had reduced motion on, and opting back in did not reach here.
       */
      const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const optedIntoMotion =
        document.documentElement.getAttribute('data-motion') === 'full';
      const reduced = osReduced && !optedIntoMotion;
      if (!reduced) {
        const wash = document.createElement('div');
        wash.className = 'theme-wash';
        wash.setAttribute('aria-hidden', 'true');
        document.body.appendChild(wash);
        window.setTimeout(() => wash.remove(), 900);

        setSwinging(true);
        if (swingTimer.current) clearTimeout(swingTimer.current);
        swingTimer.current = setTimeout(() => setSwinging(false), SWING_MS);

        /*
         * The pull.
         *
         * A pendant lamp on a cord invites exactly one gesture, so a click
         * should do what the gesture does rather than only swinging the bulb.
         *
         * Bumping a `key` rather than toggling a class is what makes it
         * reliable. A CSS animation only restarts when an element *enters* the
         * animated state, so a class that is already on does nothing on a
         * second click. The first attempt worked around that by removing the
         * class and re-adding it a frame later — and measurement showed the
         * animation starting roughly 440ms late, because the same click also
         * changes the theme and React had a large re-render to get through
         * first. A changed key remounts the element, which starts the
         * animation from frame zero with no timing to get wrong.
         */
        setYankKey((n) => n + 1);
      }
    }

    setMode(next);
  }, [isDark, setMode]);

  useEffect(
    () => () => {
      if (swingTimer.current) clearTimeout(swingTimer.current);
    },
    [],
  );

  /* ---- Pull gesture (enhancement only) ---------------------------- */

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    // Let the click handler deal with taps; only track an actual drag.
    draggingRef.current = true;
    startYRef.current = event.clientY;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is an optimisation, not a requirement: without it the drag
      // simply stops tracking if the pointer leaves the button, and the click
      // and keyboard paths are untouched. It throws for real reasons — an
      // invalid pointer id, a detached element — and in jsdom, where the
      // method does not exist at all. Neither is worth failing a toggle over.
    }
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const delta = event.clientY - startYRef.current;
    if (delta <= 0) return;
    // Resistance: the cord gives less the harder it is pulled.
    setPull(Math.min(26, Math.sqrt(delta) * 3.4));
  }, []);

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Capture may already be gone if the pointer left the window.
      }
      const pulled = pull >= PULL_THRESHOLD_PX;
      setPull(0);
      if (pulled) toggle();
    },
    [pull, toggle],
  );

  const size = compact ? 'scale-[0.82]' : '';
  const bulbW = compact ? 34 : 44;
  const bulbH = compact ? 42 : 55;
  const cordLength = (compact ? 20 : 28) + pull;

  return (
    <div
      className={cn(
        'pointer-events-none relative flex justify-center',
        compact ? 'h-[4.6rem] w-14' : 'h-[6.2rem] w-16',
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Lights — switch between dark and light mode"
        data-testid="bulb-switch"
        data-mode={ready ? mode : undefined}
        onClick={toggle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'pointer-events-auto group absolute -top-3 flex origin-top flex-col items-center',
          'cursor-pointer touch-none rounded-b-full focus-visible:outline-offset-4',
          size,
        )}
        style={{
          transformOrigin: 'top center',
          animation: swinging ? `bulb-swing ${SWING_MS}ms var(--ease-out)` : undefined,
        }}
      >
        {/* Braided flex, drawn as a strand with a twist pattern over it so it
            reads as cable rather than as a 1px rule. It stretches on pull. */}
        <span
          /*
            Namespaced. The cord and the bulb are siblings, so a bare
            `key={yankKey}` gave both of them the same key and React reported
            "two children with the same key" on every render — with the stated
            consequence that children "may be duplicated and/or omitted".
            That is why the pull did not play: the remount that restarts the
            animation was never guaranteed to happen.
          */
          key={`cord-${yankKey}`}
          aria-hidden="true"
          className={cn(
            'relative block w-[3px] transition-[height] duration-100',
            // Not on the first render: the lamp should be still when the page
            // arrives, not yanking itself.
            yankKey > 0 && 'cord-yank',
          )}
          style={{ height: `${cordLength}px` }}
        >
          {/*
            One element, two background layers — not two elements.

            The twist used to be its own 1px-wide span placed with
            `left: 50%` and `translateX(-50%)` inside a 3px parent. That lands
            it on a half-pixel, and a half-pixel line is antialiased slightly
            differently on each repaint; with the ambient background animating
            continuously, that region repaints constantly, and the result is a
            hairline flickering beside the cord for as long as the page is open.

            Painted as a background layer on the strand itself there is no
            separate box to misalign and no transform to round: the stripe is
            rasterised with the element that owns it. `background-size: 1px`
            with `center` keeps it centred without arithmetic.
          */}
          <span
            className="absolute inset-0 block rounded-full"
            style={{
              backgroundImage: [
                'repeating-linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 45%, transparent) 0 2px, transparent 2px 5px)',
                'linear-gradient(180deg, color-mix(in srgb, var(--text-subtle) 50%, transparent), color-mix(in srgb, var(--text-subtle) 90%, transparent))',
              ].join(', '),
              backgroundSize: '1px 100%, 100% 100%',
              backgroundPosition: 'center, center',
              backgroundRepeat: 'no-repeat, no-repeat',
            }}
          />
        </span>

        {/* Bulb */}
        <span
          key={`bulb-${yankKey}`}
          aria-hidden="true"
          className={cn('relative block', yankKey > 0 && 'bulb-yank')}
          /* Only while a drag is actually pulling. Leaving a `transform` here
             during the yank would override the keyframe's own transform and
             the bulb would stay put while the cord stretched. */
          style={pull > 0 ? { transform: `translateY(${pull * 0.3}px)` } : undefined}
        >
          <svg
            width={bulbW}
            height={bulbH}
            viewBox="0 0 40 50"
            fill="none"
            className="relative z-10 overflow-visible"
          >
            <defs>
              {/* The envelope catches light along its upper-left, the way
                  blown glass does. Two stops, not a photo-real gradient. */}
              <radialGradient id="bulb-glass" cx="0.36" cy="0.3" r="0.85">
                <stop
                  offset="0%"
                  stopColor={isDark ? 'var(--surface-elevated)' : '#FFF4C8'}
                  stopOpacity={isDark ? 0.9 : 1}
                />
                <stop
                  offset="42%"
                  stopColor={isDark ? 'var(--surface)' : '#FFCC5E'}
                  stopOpacity={isDark ? 0.75 : 1}
                />
                <stop
                  offset="100%"
                  stopColor={isDark ? 'var(--bg-secondary)' : '#EF9E1F'}
                  stopOpacity={isDark ? 0.6 : 1}
                />
              </radialGradient>
              <linearGradient id="bulb-cap" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3E372C" />
                <stop offset="28%" stopColor="#9A8763" />
                <stop offset="55%" stopColor="#6B5D46" />
                <stop offset="100%" stopColor="#332D24" />
              </linearGradient>
            </defs>

            {/* Envelope: the classic A-shape — a near-sphere pinched into a
                neck — rather than a rounded rectangle. It is what makes the
                silhouette read as "bulb" at this size with no colour at all. */}
            <path
              d="M20 2.6c-7.9 0-14 6-14 13.6 0 4.5 2.2 7.7 4.3 10.2 1.6 2 2.6 3.6 3 5.6h13.4c.4-2 1.4-3.6 3-5.6C31.8 23.9 34 20.7 34 16.2 34 8.6 27.9 2.6 20 2.6Z"
              fill="url(#bulb-glass)"
              stroke={isDark ? 'var(--border)' : '#E09B2E'}
              strokeWidth="1.4"
              className="transition-[stroke] duration-[var(--theme-transition)]"
            />

            {/* Specular highlight — a sliver of reflected room light. */}
            <path
              d="M11.4 12c1.1-2.9 3.4-5.2 6.3-6.2"
              stroke={isDark ? 'var(--text-subtle)' : '#FFFEF8'}
              strokeOpacity={isDark ? 0.4 : 0.95}
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Filament: two stem wires rising out of the cap, each zigzagging
                like a coil, bridged at the top. Lit, it is the light source,
                so it is warm — the one warm colour on the page, which is
                exactly why it reads as a real lamp and not a blue icon. Unlit
                it keeps a faint ember, so the control never looks broken. */}
            <g
              stroke={isDark ? '#7C6136' : '#D97706'}
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-[stroke] duration-[var(--theme-transition)]"
              style={
                isDark
                  ? undefined
                  : { filter: 'drop-shadow(0 0 3px rgba(255,176,60,0.95))' }
              }
            >
              <path d="M16.8 31V20.6" />
              <path d="M23.2 31V20.6" />
              <path d="M16.8 20.6c0-2.4 1-3.6 1.7-3.6.8 0 .7 2.1 1.5 2.1s.7-2.1 1.5-2.1c.7 0 1.7 1.2 1.7 3.6" />
            </g>

            {/* Screw cap: collar, ribbed shell, contact tip. */}
            <path d="M13.2 31h13.6v3.4H13.2z" fill="url(#bulb-cap)" />
            <path
              d="M14 34.8h12v8.4a2.2 2.2 0 0 1-2.2 2.2h-7.6a2.2 2.2 0 0 1-2.2-2.2z"
              fill="url(#bulb-cap)"
            />
            <path
              d="M14.2 37.2h11.6M14.2 39.8h11.6M14.2 42.4h11.6"
              stroke="#241F19"
              strokeOpacity="0.5"
              strokeWidth="0.9"
            />
            <path d="M17.4 45.4h5.2v2.2a1.6 1.6 0 0 1-1.6 1.6h-2a1.6 1.6 0 0 1-1.6-1.6z" fill="#2A241C" />
          </svg>

          {/* Light spill — only when lit. Warm, wide and soft: this is the
              lamp actually lighting the corner of the page. */}
          <span
            className={cn(
              'pointer-events-none absolute left-1/2 top-[32%] block -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-opacity duration-[var(--theme-transition)]',
              compact ? 'h-28 w-28' : 'h-36 w-36',
              isDark ? 'opacity-0' : 'opacity-100',
            )}
            style={{
              background:
                'radial-gradient(circle, rgba(255,196,88,0.95) 0%, rgba(255,158,44,0.55) 38%, rgba(255,140,20,0.18) 60%, transparent 76%)',
            }}
          />
          {/* Cold rim when off, so the bulb still reads as an object in a dark
              room instead of disappearing into the header. */}
          <span
            className={cn(
              'pointer-events-none absolute left-1/2 top-[28%] block -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-opacity duration-[var(--theme-transition)]',
              compact ? 'h-16 w-16' : 'h-24 w-24',
              isDark ? 'opacity-75' : 'opacity-0',
            )}
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 48%, transparent) 0%, transparent 70%)',
            }}
          />
          {/* A hint of ember on hover, so the affordance answers the pointer
              before the click lands. */}
          <span
            className={cn(
              'pointer-events-none absolute left-1/2 top-[32%] block h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-xl transition-opacity duration-[var(--motion-base)]',
              isDark ? 'group-hover:opacity-70 group-focus-visible:opacity-70' : '',
            )}
            style={{
              background: 'radial-gradient(circle, rgba(255,186,80,0.75) 0%, transparent 70%)',
            }}
          />
        </span>

        {/* Pull chain, ending in the brass acorn the reference uses. */}
        <span
          aria-hidden="true"
          className="flex flex-col items-center"
          style={{ transform: `translateY(${pull}px)` }}
        >
          <span
            className="block w-px"
            style={{
              height: compact ? '9px' : '12px',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--text-subtle) 70%, transparent), color-mix(in srgb, var(--text-subtle) 40%, transparent))',
            }}
          />
          <span
            className="block h-2.5 w-1.5 rounded-b-full rounded-t-sm opacity-80 transition-opacity group-hover:opacity-100"
            style={{ background: 'linear-gradient(180deg, #B99A5E, #7A6034)' }}
          />
        </span>
      </button>
    </div>
  );
}
