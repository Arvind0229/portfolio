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
      {/* Ambient light — every theme, tuned by --glow-opacity. */}
      <div
        className="absolute -left-[18%] -top-[22%] h-[46rem] w-[46rem] rounded-full blur-[120px]"
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
        className="absolute -right-[16%] -top-[10%] h-[38rem] w-[38rem] rounded-full blur-[130px]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-secondary) 50%, transparent) 0%, transparent 70%)',
          opacity: 'calc(var(--glow-opacity) * 0.7)',
        }}
      />

      {/* Engineering + Enterprise: technical grid. Studio sets --grid-opacity to 0. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 'var(--grid-opacity)',
          backgroundImage:
            'linear-gradient(to right, var(--text-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--text-subtle) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />

      {theme === 'engineering' ? <NetworkLayer /> : null}
      {theme === 'studio' ? <StudioLayer /> : null}
      {theme === 'enterprise' ? <EnterpriseLayer /> : null}
    </div>
  );
}

/** Engineering: a sparse node/edge diagram, echoing an automation pipeline. */
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

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 70"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.42 }}
    >
      <g stroke="var(--accent-primary)" strokeWidth="0.09" opacity="0.5">
        {edges.map(([from, to]) => {
          const a = nodes[from];
          const b = nodes[to];
          if (!a || !b) return null;
          return <line key={`${from}-${to}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} />;
        })}
      </g>
      <g fill="var(--accent-primary)">
        {nodes.map((node, index) => (
          <circle
            key={`${node.cx}-${node.cy}`}
            cx={node.cx}
            cy={node.cy}
            r="0.42"
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
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="0.7"
        />
        <circle
          cx="100"
          cy="100"
          r="58"
          fill="none"
          stroke="var(--accent-secondary)"
          strokeWidth="0.7"
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

/** Enterprise: a single restrained horizon line. Nothing moves. */
function EnterpriseLayer() {
  return (
    <div
      className="absolute inset-x-0 top-[62vh] h-px"
      style={{
        background:
          'linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-primary) 40%, transparent), transparent)',
        opacity: 0.5,
      }}
    />
  );
}
