'use client';

import { useEffect, useRef } from 'react';

import { useAppearance } from '@/hooks/use-appearance';

/**
 * Theme backdrop.
 *
 * Each theme gets its own background language, drawn with CSS gradients and a
 * single inline SVG. No canvas loop, no WebGL, no particle library: the
 * decorative layer must not cost the main thread anything on a mid-range
 * phone. Everything here is composited by the GPU and paints once.
 *
 * The whole layer is aria-hidden and pointer-events-none — decoration only.
 */
export function Backdrop() {
  const { theme } = useAppearance();
  const rootRef = useRef<HTMLDivElement | null>(null);
  usePointerReaction(rootRef, theme);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="backdrop-root pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/*
        Each theme owns its ground. Nothing is shared.

        Until now two ambient orbs and the moving grid rendered on *every*
        theme, with only the signature layer swapped on top. That is why the
        four read as relatives however different their palettes were: the
        floor under them was the same floor. The grid in particular is a
        technical idiom — it belongs to Midnight and it was showing faintly
        behind pastel clay and behind a mandala, where it means nothing.

        So the orbs and the grid moved *into* Midnight, and the other three
        bring their own atmosphere. The layer is still exactly one component
        and still mounts exactly one signature at a time, which is what keeps
        the isolation guarantee.
      */}
      {theme === 'engineering' ? <MidnightGround /> : null}

      {theme === 'clay' ? <ClayLayer /> : null}
      {theme === 'engineering' ? <NetworkLayer /> : null}
      {theme === 'studio' ? (
        <>
          <StudioField />
          <StudioMandalas />
        </>
      ) : null}
      {theme === 'enterprise' ? (
        <>
          <CrimsonGround />
          <CrimsonMandala />
          <CrimsonLayer />
        </>
      ) : null}
    </div>
  );
}

/**
 * The background answering the mouse.
 *
 * Arvind asked for the background to react on hover. The layer is
 * `pointer-events: none` (it must never steal a click), so "hover" is measured
 * rather than received: one `pointermove` listener on the document, throttled
 * to one pass per frame, that writes
 *
 * - `--px` / `--py` on the root: the pointer across the viewport, -1 to 1.
 *   Every `[data-react]` item shifts by that times its own `--depth`, so near
 *   and far items move by different amounts — parallax.
 * - `--rx` / `--ry` / `--near` on each `[data-react="near"]` item within reach
 *   of the pointer: it is nudged away from the cursor and grows slightly, as
 *   if pushed. Out of reach, all three go back to zero.
 *
 * CSS does the moving, through the `translate` and `scale` properties, so it
 * composes with each item's own drift animation (which uses `transform`) and
 * eases in with a transition rather than snapping.
 *
 * Mouse only, and nothing under reduced motion: the same two-part check as
 * the rest of the site. On touch there is no hover to answer.
 */
function usePointerReaction(rootRef: React.RefObject<HTMLDivElement | null>, theme: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches) return;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const REACH = 240;
    const PUSH = 70;
    let frame = 0;
    let x = -1;
    let y = -1;
    // What each item has been pushed by, so its resting centre is measured
    // rather than the pushed one — measuring the pushed rect feeds the push
    // back into itself and the item shivers.
    const pushed = new WeakMap<HTMLElement, { x: number; y: number }>();

    const reset = () => {
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
      root.querySelectorAll<HTMLElement>('[data-react="near"]').forEach((el) => {
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
        el.style.removeProperty('--near');
        pushed.delete(el);
      });
    };

    const flush = () => {
      frame = 0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      root.style.setProperty('--px', ((x / w) * 2 - 1).toFixed(3));
      root.style.setProperty('--py', ((y / h) * 2 - 1).toFixed(3));
      root.querySelectorAll<HTMLElement>('[data-react="near"]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;
        const prev = pushed.get(el) ?? { x: 0, y: 0 };
        const dx = rect.left + rect.width / 2 - prev.x - x;
        const dy = rect.top + rect.height / 2 - prev.y - y;
        const distance = Math.hypot(dx, dy) || 1;
        const reach = REACH + rect.width / 2;
        const near = distance < reach ? 1 - distance / reach : 0;
        if (near === 0 && prev.x === 0 && prev.y === 0) return;
        const next = { x: (dx / distance) * near * PUSH, y: (dy / distance) * near * PUSH };
        el.style.setProperty('--rx', `${next.x.toFixed(1)}px`);
        el.style.setProperty('--ry', `${next.y.toFixed(1)}px`);
        el.style.setProperty('--near', near.toFixed(3));
        pushed.set(el, next);
      });
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (reducedQuery.matches && document.documentElement.dataset.motion !== 'full') return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', reset);
      if (frame) cancelAnimationFrame(frame);
      reset();
    };
    // Re-run on theme change: each theme mounts a different set of items.
  }, [rootRef, theme]);
}

/**
 * Signature theme: a live circuit.
 *
 * Two layers of the same idea. The lattice underneath is the topology — nodes
 * and the links between them, static, so the eye has something stable to read.
 * The circuit on top is the traffic: PCB traces with a bright pulse running
 * along each one, arriving at a pad, which flashes as it passes.
 *
 * Every pulse is one path drawn twice: a dim base stroke that is always there,
 * and a bright stroke with a very short dash and a very long gap, whose
 * `stroke-dashoffset` animates. That is the whole trick — the dash is the
 * charge, the gap is the wait, and the browser animates it on the paint thread
 * without touching layout. Durations are deliberately unequal and start
 * offsets are staggered, because pulses that arrive in lockstep read as a
 * loading bar rather than as traffic.
 *
 * The layer is masked away from the reading column and sits well below the
 * text in opacity: it is weather, not content.
 */
function NetworkLayer() {
  const nodes = [
    { cx: 12, cy: 22 },
    { cx: 30, cy: 12 },
    { cx: 48, cy: 26 },
    { cx: 68, cy: 15 },
    { cx: 86, cy: 30 },
    { cx: 22, cy: 46 },
    { cx: 56, cy: 52 },
    { cx: 78, cy: 60 },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [2, 6],
    [6, 7],
    [4, 7],
  ];

  /* PCB traces. Right angles and 45° chamfers, the way a board is actually
     routed — a curve here would read as decoration, and the point is that
     this looks like something carrying current. */
  const traces: Array<{ d: string; dur: number; delay: number }> = [
    { d: 'M-2 18h18l6 6h22l5-5h26l6 6h22', dur: 7.5, delay: 0 },
    { d: 'M-2 34h12l7-7h30l6 6h20l8-8h21', dur: 9.5, delay: 1.4 },
    { d: 'M-2 52h26l6-6h18l7 7h16l6-6h25', dur: 8.2, delay: 2.9 },
    { d: 'M14 -2v12l6 6v16l-6 6v18', dur: 11, delay: 0.8 },
    { d: 'M62 -2v10l-6 6v20l6 6v22', dur: 10, delay: 3.6 },
    { d: 'M92 -2v16l-7 7v14l7 7v20', dur: 8.8, delay: 2.1 },
  ];

  /* Pads sit where traces meet. They flash as charge reaches them. */
  const pads = [
    { cx: 22, cy: 24, delay: 0.9 },
    { cx: 49, cy: 19, delay: 2.2 },
    { cx: 81, cy: 24, delay: 3.4 },
    { cx: 19, cy: 27, delay: 1.6 },
    { cx: 56, cy: 33, delay: 4.1 },
    { cx: 85, cy: 30, delay: 2.7 },
    { cx: 32, cy: 46, delay: 3.1 },
    { cx: 63, cy: 46, delay: 1.2 },
  ];

  return (
    <svg
      /* `circuit-drift` moves the whole board slowly against the grid, and in
         the opposite direction. Opposed motion is what stops the two layers
         reading as one sheet — the eye separates them at once, and the traces
         sit behind the grid rather than being printed on it. */
      className="circuit-drift absolute inset-0 h-full w-full"
      data-react="far"
      viewBox="0 0 100 70"
      preserveAspectRatio="xMidYMid slice"
      style={{
        ['--depth' as string]: '-18px',
        opacity: 0.55,
        /* A horizontal fade rather than the radial one this had before. The
           radial confined the whole circuit to a blob behind the figure; a
           left-fade lets the traces run the full height of the page — so the
           current reads as going somewhere — while still dropping to nothing
           across the reading column, which is the only part that matters for
           legibility. */
        maskImage:
          'linear-gradient(to left, #000 0%, #000 42%, rgba(0,0,0,0.34) 68%, transparent 93%)',
        WebkitMaskImage:
          'linear-gradient(to left, #000 0%, #000 42%, rgba(0,0,0,0.34) 68%, transparent 93%)',
      }}
    >
      {/* --- Circuit traces: the dim copper they are etched in --- */}
      <g
        stroke="var(--accent-primary)"
        strokeWidth="0.16"
        strokeOpacity="0.22"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {traces.map((trace) => (
          <path key={trace.d} d={trace.d} />
        ))}
      </g>

      {/* --- and the charge running along them ---
          A 1.2-unit dash in a 300-unit gap: one bright packet per trace,
          travelling, with a long dark wait between passes. */}
      <g
        stroke="var(--accent-tertiary)"
        strokeWidth="0.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {traces.map((trace) => (
          <path
            key={`pulse-${trace.d}`}
            d={trace.d}
            className="circuit-anim"
            strokeDasharray="1.2 300"
            style={{
              animation: `circuit-pulse ${trace.dur}s linear ${trace.delay}s infinite`,
            }}
          />
        ))}
      </g>

      {/* --- Pads: they answer when charge arrives --- */}
      <g fill="var(--accent-tertiary)">
        {pads.map((pad) => (
          <g key={`${pad.cx}-${pad.cy}`}>
            <circle cx={pad.cx} cy={pad.cy} r="0.5" opacity="0.28" />
            <circle
              cx={pad.cx}
              cy={pad.cy}
              r="0.5"
              className="circuit-pad"
              style={{
                animationDelay: `${pad.delay}s`,
                transformOrigin: `${pad.cx}px ${pad.cy}px`,
              }}
            />
          </g>
        ))}
      </g>

      {/* --- Topology: the static lattice underneath --- */}
      <g stroke="var(--accent-primary)" strokeWidth="0.07" opacity="0.3">
        {edges.map(([from, to]) => {
          const a = nodes[from];
          const b = nodes[to];
          if (!a || !b) return null;
          return <line key={`${from}-${to}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} />;
        })}
      </g>

      {/* Traffic on the lattice itself: a short dash running each link. */}
      <g stroke="var(--accent-secondary)" strokeWidth="0.14" strokeLinecap="round">
        {edges.slice(0, 6).map(([from, to], index) => {
          const a = nodes[from];
          const b = nodes[to];
          if (!a || !b) return null;
          return (
            <line
              key={`flow-${from}-${to}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              className="circuit-anim"
              strokeDasharray="1.4 10"
              opacity="0.7"
              style={{
                animation: `dash-flow ${9 + (index % 3) * 2.5}s linear ${index * 1.3}s infinite`,
              }}
            />
          );
        })}
      </g>

      <g fill="var(--accent-primary)">
        {nodes.map((node, index) => (
          <circle
            key={`${node.cx}-${node.cy}`}
            cx={node.cx}
            cy={node.cy}
            r="0.42"
            className="circuit-anim"
            style={{
              animation: `pulse-node ${5 + (index % 4)}s var(--ease-in-out) ${index * 0.45}s infinite`,
              transformOrigin: `${node.cx}px ${node.cy}px`,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Studio's signature: Arvind's own mandalas, a dozen for each mode, drifting
 * across the page, turning, and slowly changing into one another.
 *
 * ## What moves
 *
 * Seven slots spread over the viewport. Each slot holds two mandalas stacked
 * on top of each other; the slot drifts on its own slow path, each mandala
 * turns at its own speed (some clockwise, some not), and the two cross-fade
 * on a long cycle — so a mandala is never quite where, nor quite *which*, it
 * was a minute ago. The "random" is a fixed table rather than
 * `Math.random()`: it is the same on the server and the client, and it can be
 * tuned.
 *
 * ## Dark and light
 *
 * Arvind supplied a separate set for each mode — glowing line-work on dark,
 * watercolour on light — and the colours are his, untouched. Each element
 * names both files as CSS variables and the stylesheet picks one by
 * `data-mode`, so only the active mode's set is ever downloaded. The images
 * were cut from his sheets with the backgrounds turned into transparency and
 * the baked-in labels cropped off. 280px each, never shown larger.
 *
 * ## Cost
 *
 * `transform` and `opacity` only — compositor work. At <=430px three slots
 * remain and they only turn; under reduced motion nothing moves at all.
 */
const MANDALA_SLOTS = [
  // left%, top%, size px, first image, second image, drift s, turn s, fade s, reverse
  // Three are drawn larger than the 280px source (up to 1.45×) because Arvind
  // asked for bigger ones. At 40% opacity, turning, the softening is not
  // visible; the other four stay at or below native size.
  [6, 10, 380, 1, 7, 34, 48, 22, false],
  [72, 4, 220, 3, 9, 40, 60, 26, true],
  [40, 38, 180, 5, 11, 30, 40, 19, false],
  [86, 44, 340, 2, 8, 44, 70, 24, false],
  [10, 62, 220, 4, 10, 36, 52, 21, true],
  [60, 76, 400, 6, 12, 42, 66, 28, false],
  [28, 90, 170, 9, 3, 32, 38, 18, true],
] as const;

/**
 * Crimson's mandala: one of Arvind's designs, recoloured — burgundy, red glow
 * and gold on dark; crimson, rose and gold on cream — turning slowly in two
 * places. Deliberately *one* motif at rest, not Studio's drifting field, so the
 * two themes stay distinguishable. Shown at its native 300px, never enlarged.
 */
function CrimsonMandala() {
  return (
    <div className="crimson-mandalas">
      <span className="crimson-mandala crimson-mandala-a" data-react="near" />
      <span className="crimson-mandala crimson-mandala-b" data-react="near" />
    </div>
  );
}

function StudioMandalas() {
  const file = (mode: 'dark' | 'light', n: number) =>
    `url('/mandala/${mode}-${String(n).padStart(2, '0')}.webp')`;
  return (
    <div className="studio-mandalas">
      {MANDALA_SLOTS.map(([left, top, size, a, b, drift, turn, fade, reverse], index) => (
        <div
          key={index}
          className="studio-mandala-slot"
          data-react="near"
          style={
            {
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              '--drift': `${drift}s`,
              '--k': index,
              '--depth': `${Math.round(size / 10)}px`,
            } as React.CSSProperties
          }
        >
          {[a, b].map((n, layer) => (
            <span
              key={layer}
              className={`studio-mandala studio-mandala-${layer === 0 ? 'a' : 'b'}`}
              style={
                {
                  '--md': file('dark', n),
                  '--ml': file('light', n),
                  '--turn': `${turn + layer * 17}s`,
                  '--fade': `${fade}s`,
                  '--dir': reverse !== (layer === 1) ? 'reverse' : 'normal',
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Midnight's ground: two ambient orbs and the moving grid.
 *
 * This is the original shared backdrop, now scoped to the one theme it was
 * ever really designed for. A drifting technical grid under a control-room
 * palette is the theme's whole atmosphere; under pastel clay it was a faint
 * graph-paper artefact nobody asked for.
 *
 * Neither orb carries `will-change: transform`, and it must not be added
 * back. They animate continuously, so the browser composites them anyway; the
 * hint bought nothing and forced the layer to exist even when the animation
 * was not running — including under reduced motion, where these stop
 * outright. Two layers this large and this blurred are exactly the kind a
 * phone runs out of memory for, and when it does, other layers on the page
 * start coming back blank.
 */
function MidnightGround() {
  return (
    <>
      <div
        className="orb-drift-a absolute -left-[18%] -top-[22%] h-[24rem] w-[24rem] sm:h-[42rem] sm:w-[42rem] rounded-full blur-[40px] sm:blur-[70px]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 55%, transparent) 0%, transparent 68%)',
          opacity: 'var(--glow-opacity)',
        }}
      />
      {/* Both glows are anchored to the top of the page. An ambient blob behind
          the middle of the document tints the text that scrolls over it, which
          costs contrast for decoration nobody asked for. */}
      <div
        className="orb-drift-b absolute -right-[16%] -top-[10%] h-[20rem] w-[20rem] sm:h-[34rem] sm:w-[34rem] rounded-full blur-[40px] sm:blur-[70px]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-secondary) 50%, transparent) 0%, transparent 70%)',
          opacity: 'calc(var(--glow-opacity) * 0.7)',
        }}
      />
      {/* Two grids at different scales and speeds inside a static masked
          window — the mask cannot sit on the moving element or the fade
          travels with it and slides off the page. */}
      <div className="grid-window">
        <div className="grid-plane-far" />
        <div className="grid-plane" />
      </div>
    </>
  );
}

/**
 * Studio's ground: a slow particle field and two light streaks.
 *
 * The mandala needs something to float in. The reference for this theme is a
 * field of drifting points with soft ribbons of light crossing it, which is
 * also the cheapest thing that reads as depth: eighteen absolutely-positioned
 * dots and two blurred gradients, all animating `transform` and `opacity`.
 *
 * Positions come from a fixed table rather than `Math.random()` — a random
 * field re-rolls on every render and cannot be tuned, and it would differ
 * between the server and the client.
 */
function StudioField() {
  const motes = [
    [6, 18, 0], [14, 62, 3], [22, 34, 6], [29, 78, 1], [37, 12, 8], [44, 52, 4],
    [52, 88, 2], [58, 26, 7], [66, 68, 5], [72, 8, 9], [79, 44, 1], [85, 74, 6],
    [91, 22, 3], [12, 90, 7], [48, 4, 2], [95, 56, 8], [34, 96, 5], [60, 40, 0],
  ] as const;

  return (
    <>
      <div className="studio-streak studio-streak-a" />
      <div className="studio-streak studio-streak-b" />
      {motes.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          className="studio-mote"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `${-delay * 2.4}s`,
          }}
        />
      ))}
    </>
  );
}

/**
 * Crimson's ground: one soft crimson rise from below the fold.
 *
 * Not the shared orbs — those are keyed to `--accent-primary` and
 * `--accent-secondary`, which on this theme would put a blue glow in a
 * crimson room. One low, wide radial instead, anchored to the bottom so it
 * lifts the web geometry off the near-black without tinting the text that
 * scrolls over the top of the page.
 */
function CrimsonGround() {
  return (
    <>
    {/* Arvind's crimson backgrounds — burgundy on dark, cream-and-red on
        light. The stylesheet picks one by mode, so only one downloads. */}
    <div className="crimson-bg" />
    <div
      className="crimson-rise absolute inset-x-0 bottom-0 h-[70vh]"
      style={{
        background:
          'radial-gradient(60% 100% at 50% 100%, color-mix(in srgb, var(--crimson) 42%, transparent) 0%, transparent 72%)',
      }}
    />
    </>
  );
}

/**
 * Light Clay: pastel atmosphere.
 *
 * Three very soft pastel washes and a single automation rail. Deliberately
 * the quietest of the four backdrops — a clay theme gets its character from
 * the *surfaces*, and a busy ground behind soft white cards makes them look
 * dirty rather than dimensional.
 */
/**
 * Marbles from Arvind's sheet — mint, pearl, gold, swirled — floating around
 * the page at different sizes on their own slow paths. The sheet's
 * "transparency" was a painted checkerboard; each marble was cut out with a
 * mask that removes it. Clear-glass bubbles were left out, because the painted
 * checkerboard shows through them. Displayed smaller than their source, so
 * they stay sharp. Positions come from a fixed table (same on server and
 * client), and the paths differ per marble so they never move in step.
 */
const MARBLES = [
  // file, left%, top%, size px, dx vw, dy vh, seconds — kept to the margins,
  // out of the reading column, so they never sit under a paragraph. Sizes
  // never exceed the file's own pixels (marble-01 and -04 are 216px).
  [1, 1, 12, 180, 6, -12, 26],
  [2, 92, 8, 90, -6, 14, 30],
  [7, 95, 30, 48, -4, 10, 22],
  [4, 2, 40, 200, 6, 14, 34],
  [6, 93, 50, 170, -6, -9, 31],
  [11, 6, 26, 40, 4, -10, 20],
  [9, 90, 72, 160, -6, -14, 28],
  [14, 4, 70, 60, 6, -12, 24],
  [12, 96, 90, 90, -4, -14, 32],
  [17, 1, 88, 150, 6, -10, 36],
  [5, 88, 4, 70, -6, 12, 23],
  [15, 3, 56, 110, 4, 12, 30]] as const;

function ClayMarbles() {
  return (
    <div className="clay-marbles">
      {MARBLES.map(([file, left, top, size, dx, dy, dur], index) => (
        <span
          key={index}
          className="clay-marble"
          data-react="near"
          style={
            {
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              backgroundImage: `url('/clay/marble-${String(file).padStart(2, '0')}.webp')`,
              '--dx': `${dx}vw`,
              '--dy': `${dy}vh`,
              '--dur': `${dur}s`,
              '--k': index,
              '--depth': `${Math.round(size / 6)}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function ClayLayer() {
  /*
   * Six soft objects, each with its own hue, size, position and period.
   * Position and size live here; the lighting, the colour-keyed shadow and
   * the motion live in CSS. Nothing here is random — a random walk reads as
   * drift rather than as floating, and it cannot be tuned.
   */
  const bubbles = [
    /*
     * Sized and placed to stay out of the reading column.
     *
     * The first cut used 20rem spheres at 55% opacity anchored near the
     * content, and they sat *on top of* the headline — decoration competing
     * with the thing it decorates. These are roughly half the size, a third
     * of the opacity, and pushed to the page margins and the deep background
     * where they read as atmosphere.
     */
    { cls: 'bubble-1', h: 'var(--h-lavender)', style: { left: '-9%', top: '4%', width: '22rem', height: '22rem' } },
    { cls: 'bubble-2', h: 'var(--h-sky)', style: { right: '-7%', top: '2%', width: '11rem', height: '11rem' } },
    { cls: 'bubble-3', h: 'var(--h-peach)', style: { right: '-8%', top: '56%', width: '19rem', height: '19rem' } },
    { cls: 'bubble-4', h: 'var(--h-mint)', style: { left: '-4%', top: '66%', width: '7rem', height: '7rem' } },
    { cls: 'bubble-5', h: 'var(--h-pink)', style: { right: '10%', top: '86%', width: '15rem', height: '15rem' } },
    { cls: 'bubble-6', h: 'var(--h-lemon)', style: { left: '4%', top: '88%', width: '5rem', height: '5rem' } },
  ] as const;

  return (
    <>
      {/* Arvind's mint backgrounds, light mode only, slowly cross-fading. */}
      <div className="clay-bg clay-bg-a" />
      <div className="clay-bg clay-bg-b" />
      <ClayMarbles />
      {bubbles.map((bubble) => (
        <div
          key={bubble.cls}
          data-react="near"
          className={`clay-bubble ${bubble.cls}`}
          style={{ ...bubble.style, ['--h' as string]: bubble.h }}
        />
      ))}
      {/* The automation rail: the RPA cue in the ground, so the identity is
          present without a second workflow competing with the hero's. */}
      <div className="clay-rail absolute inset-x-0 top-[70vh] h-px" />
    </>
  );
}

/**
 * Crimson: abstract technical web geometry.
 *
 * Radial spokes and two concentric polygons, drawn thin and dark, with a
 * crimson charge travelling the spokes. Original geometry: radial lines and
 * polygonal connectors are a technical drawing idiom, and nothing here
 * reproduces any character, logo or branded artwork.
 *
 * It is the *ground*. The workflow story is told by `automation-flow` in the
 * hero, which already reads its colours from these tokens.
 */
function CrimsonLayer() {
  const spokes = Array.from({ length: 16 }, (_, index) => index * 22.5);
  const ring = (r: number, sides: number) =>
    Array.from({ length: sides }, (_, index) => {
      const angle = (index / sides) * Math.PI * 2 - Math.PI / 2;
      return `${(100 + r * Math.cos(angle)).toFixed(2)},${(100 + r * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');

  return (
    <svg className="crimson-web" data-react="far" style={{ ['--depth' as string]: '-14px' }} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="var(--crimson-light)" fill="none" strokeWidth="0.4" opacity="0.5">
        {spokes.map((angle) => (
          <line key={angle} x1="100" y1="100" x2="100" y2="2" transform={`rotate(${angle} 100 100)`} />
        ))}
        <polygon points={ring(88, 16)} />
        <polygon points={ring(58, 16)} />
        <polygon points={ring(30, 16)} />
      </g>
      {/* Two charges, unequal periods, so they never pair up into a pulse. */}
      <line className="crimson-charge" x1="100" y1="100" x2="100" y2="2" stroke="var(--accent-vivid)" strokeWidth="0.9" />
      <line
        className="crimson-charge crimson-charge-b"
        x1="100"
        y1="100"
        x2="100"
        y2="2"
        stroke="var(--accent-secondary)"
        strokeWidth="0.7"
        transform="rotate(135 100 100)"
      />
    </svg>
  );
}

