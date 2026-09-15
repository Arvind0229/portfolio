'use client';

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

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/*
        Ambient light — every theme, tuned by --glow-opacity.

        Neither orb carries `will-change: transform`, and it should not be added
        back. They animate continuously, so the browser composites them anyway;
        the hint bought nothing and forced the layer to exist even when the
        animation is not running — including under reduced motion, where these
        are stopped outright. Two layers this large and this blurred are exactly
        the kind a phone runs out of memory for, and when it does, other layers
        on the page start coming back blank.
      */}
      <div
        className="orb-drift-a absolute -left-[18%] -top-[22%] h-[24rem] w-[24rem] sm:h-[42rem] sm:w-[42rem] rounded-full blur-[40px] sm:blur-[70px]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 55%, transparent) 0%, transparent 68%)',
          opacity: 'var(--glow-opacity)',
        }}
      />
      {/* Both glows are anchored to the top of the page. An ambient blob sitting
          behind the middle of the document tints the text that scrolls over it,
          which costs contrast for decoration nobody asked for. */}
      <div
        className="orb-drift-b absolute -right-[16%] -top-[10%] h-[20rem] w-[20rem] sm:h-[34rem] sm:w-[34rem] rounded-full blur-[40px] sm:blur-[70px]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-secondary) 50%, transparent) 0%, transparent 70%)',
          opacity: 'calc(var(--glow-opacity) * 0.7)',
        }}
      />

      {/* The moving ground. Two grids at different scales and speeds, inside a
          static masked window — the mask cannot sit on the moving element or
          the fade travels with it and slides off the page. Studio sets
          --grid-opacity to 0 and gets its own language instead. */}
      <div className="grid-window">
        <div className="grid-plane-far" />
        <div className="grid-plane" />
      </div>

      {/*
        Exactly one signature layer is mounted at a time.

        This is what enforces theme isolation: a layer that is not the
        active theme's does not exist in the DOM, so it cannot animate, hold
        a timer, or leak into a screenshot. Switching theme unmounts the old
        one, which is the cleanup — there is nothing to tear down by hand.
      */}
      {theme === 'clay' ? <ClayLayer /> : null}
      {theme === 'engineering' ? <NetworkLayer /> : null}
      {theme === 'studio' ? <MandalaLayer /> : null}
      {theme === 'enterprise' ? <CrimsonLayer /> : null}
    </div>
  );
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
      viewBox="0 0 100 70"
      preserveAspectRatio="xMidYMid slice"
      style={{
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
 * Studio: a generative mandala.
 *
 * Five nested rings on one shared centre, each a `<g>` with its own rotation
 * period and direction. What makes it read as a mandala rather than as a
 * spinning circle is radial *repetition*: the petal and tick layers are
 * generated by rotating one motif N times around the centre, so the eye finds
 * symmetry wherever it lands.
 *
 * ## Why it costs almost nothing
 *
 * One inline SVG, and every animation is a `transform: rotate` on a group.
 * The compositor handles those; layout never runs, nothing repaints, and
 * there is no canvas, no WebGL, no per-frame JavaScript and no library. The
 * two rings that were here before are kept, at their original radii and
 * periods, because they were already right — this adds the layers around them
 * rather than replacing them.
 *
 * ## Centred, not cornered
 *
 * The previous version was a 30rem box pinned to the top-right, which is an
 * ornament. A mandala is an environment, so this one is centred on the page
 * and sized in viewport units, with its opacity low enough that text crossing
 * it never loses contrast.
 *
 * ## Mobile
 *
 * At ≤430px the outer layers are dropped and rotation stops — the starting
 * hypothesis from the motion spec. A phone renders the geometry, not the
 * movement.
 */
function MandalaLayer() {
  /* One motif, repeated around the centre. Generated rather than hand-written
     so the symmetry is exact — twelve hand-placed petals are twelve chances
     to be half a degree out. */
  const petals = Array.from({ length: 12 }, (_, index) => index * 30);
  const ticks = Array.from({ length: 24 }, (_, index) => index * 15);

  return (
    <>
      <svg
        className="mandala"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* Layer 4 — outer tick ring, slowest, clockwise */}
        <g className="mandala-l4" style={{ transformOrigin: '100px 100px' }}>
          {ticks.map((angle) => (
            <line
              key={angle}
              x1="100"
              y1="6"
              x2="100"
              y2="14"
              stroke="var(--accent-tertiary)"
              strokeWidth="0.35"
              transform={`rotate(${angle} 100 100)`}
            />
          ))}
        </g>

        {/* Layer 3 — petals, counter-rotating */}
        <g className="mandala-l3" style={{ transformOrigin: '100px 100px' }}>
          {petals.map((angle) => (
            <path
              key={angle}
              d="M100 26 C112 48, 112 66, 100 84 C88 66, 88 48, 100 26 Z"
              fill="none"
              stroke="var(--accent-secondary)"
              strokeWidth="0.3"
              transform={`rotate(${angle} 100 100)`}
            />
          ))}
        </g>

        {/* Layer 2 — the original dashed ring, kept at r=86 and 90s */}
        <g className="mandala-l2" style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="0.4"
            strokeDasharray="18 10"
          />
        </g>

        {/* Layer 1 — the original inner ring, kept at r=58, reversed */}
        <g className="mandala-l1" style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100"
            cy="100"
            r="58"
            fill="none"
            stroke="var(--accent-secondary)"
            strokeWidth="0.4"
            strokeDasharray="9 14"
          />
          <circle
            cx="100"
            cy="100"
            r="34"
            fill="none"
            stroke="var(--accent-tertiary)"
            strokeWidth="0.3"
            strokeDasharray="4 8"
          />
        </g>

        {/* Layer 0 — the centre mark. Breathes rather than turns: a rotating
            centre has no feature to track and reads as stillness anyway. */}
        <g className="mandala-l0" style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100"
            cy="100"
            r="12"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="0.5"
          />
          <path d="M88 100 H112 M100 88 V112" stroke="var(--accent-primary)" strokeWidth="0.35" />
        </g>
      </svg>

      {/* The paper grain that gave Studio its character. Unchanged. */}
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{
          opacity: 'var(--noise-opacity)',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.28'/%3E%3C/svg%3E\")",
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
    { cls: 'bubble-1', h: 'var(--h-lavender)', style: { left: '-9%', top: '4%', width: '13rem', height: '13rem' } },
    { cls: 'bubble-2', h: 'var(--h-sky)', style: { right: '-7%', top: '2%', width: '11rem', height: '11rem' } },
    { cls: 'bubble-3', h: 'var(--h-peach)', style: { right: '-5%', top: '58%', width: '12rem', height: '12rem' } },
    { cls: 'bubble-4', h: 'var(--h-mint)', style: { left: '-4%', top: '66%', width: '7rem', height: '7rem' } },
    { cls: 'bubble-5', h: 'var(--h-pink)', style: { right: '12%', top: '90%', width: '9rem', height: '9rem' } },
    { cls: 'bubble-6', h: 'var(--h-lemon)', style: { left: '4%', top: '88%', width: '5rem', height: '5rem' } },
  ] as const;

  return (
    <>
      {bubbles.map((bubble) => (
        <div
          key={bubble.cls}
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
    <svg className="crimson-web" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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

