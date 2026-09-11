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

      {theme === 'engineering' ? <NetworkLayer /> : null}
      {theme === 'studio' ? <StudioLayer /> : null}
      {theme === 'enterprise' ? <EnterpriseLayer /> : null}
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

/** Studio: large abstract editorial shapes and a paper grain. */
function StudioLayer() {
  return (
    <>
      <svg
        className="absolute -right-[6%] top-[8%] h-[30rem] w-[30rem]"
        viewBox="0 0 200 200"
        style={{ opacity: 0.14 }}
      >
        {/* Dashed and counter-rotating, so the rings read as a mechanism
            idling. A solid circle turning is invisible — there is no feature
            on it to track — which is why the dashes are here at all. */}
        <circle
          className="ring-turn-slow"
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="0.7"
          strokeDasharray="18 10"
        />
        <circle
          className="ring-turn-rev"
          cx="100"
          cy="100"
          r="58"
          fill="none"
          stroke="var(--accent-secondary)"
          strokeWidth="0.7"
          strokeDasharray="9 14"
        />
        <path d="M14 100 H186" stroke="var(--accent-tertiary)" strokeWidth="0.7" />
      </svg>
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
 * Enterprise: a single restrained horizon line, with a brighter segment
 * travelling along it.
 *
 * This used to be captioned "nothing moves", which was accurate and was the
 * problem — on this theme the inner pages had no motion at all. A highlight
 * running along a one-pixel rule is the most restrained thing this theme can
 * do and still be alive rather than printed.
 */
function EnterpriseLayer() {
  return (
    <div
      className="horizon-run absolute inset-x-0 top-[62vh] h-px"
      style={{
        background:
          'linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-primary) 40%, transparent), transparent)',
        opacity: 0.5,
      }}
    />
  );
}
