'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils/cn';

/**
 * The automation pipeline.
 *
 * The single visual that has to say "I build systems that automate processes"
 * before anyone reads a word. A manual queue feeds a bot, the bot drives
 * processing, validation and delivery, and packets of data move along the
 * path while each stage lights as the work reaches it.
 *
 * Implementation notes that matter:
 *
 *   - It is one inline SVG. No canvas, no WebGL, no animation library. Every
 *     moving part is a CSS keyframe on `transform`, `opacity`,
 *     `offset-distance` or `stroke-dashoffset`, so the compositor owns them.
 *   - Animations are paused while the element is off-screen
 *     (`animation-play-state`), so a visitor reading the contact section is
 *     not paying for a pipeline four sections up.
 *   - Packets ride the real path with `offset-path`, so the motion follows the
 *     geometry exactly; if a browser lacks `offset-path` the packets simply do
 *     not appear and the diagram still reads correctly.
 *   - Under reduced motion the pipeline renders fully drawn and still. The
 *     information is in the diagram, not in the movement.
 *
 * Labels come from props so the same component serves the hero (compact) and
 * the architecture section (full), without a second implementation.
 */

export interface PipelineStage {
  id: string;
  label: string;
  /** Optional second line — a technology or a note. */
  detail?: string;
}

/** The default stages: the shape of every automation in the portfolio. */
export const DEFAULT_STAGES: readonly PipelineStage[] = [
  { id: 'manual', label: 'Manual process', detail: 'Queue / trigger' },
  { id: 'bot', label: 'RPA bot', detail: 'TruBot' },
  { id: 'processing', label: 'Data processing', detail: 'SQL · Python' },
  { id: 'validation', label: 'Validation', detail: 'Exception rules' },
  { id: 'result', label: 'Automated result', detail: 'MIS · Alerts' },
];

const VIEW_W = 1000;
const VIEW_H = 190;

export function AutomationPipeline({
  stages = DEFAULT_STAGES,
  className,
  compact = false,
}: {
  stages?: readonly PipelineStage[];
  className?: string;
  compact?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2, once: false });
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState(900);

  // Measured rather than guessed: the dash animation needs the real length, and
  // a hard-coded value drifts the moment the geometry changes.
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    try {
      setPathLength(Math.ceil(path.getTotalLength()));
    } catch {
      // jsdom and a few older engines do not implement getTotalLength; the
      // fallback length only affects the draw-in, never the layout.
    }
  }, []);

  const count = stages.length;
  const gap = VIEW_W / (count + 1);
  const points = stages.map((stage, index) => ({
    ...stage,
    x: gap * (index + 1),
    // A gentle alternating rise keeps it from reading as a plain bar chart.
    y: VIEW_H / 2 + (index % 2 === 0 ? -14 : 14),
  }));

  const d = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1]!;
      const midX = (previous.x + point.x) / 2;
      return `C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(' ');

  const playState = inView ? 'running' : 'paused';

  return (
    <div
      ref={ref}
      className={cn('relative w-full', className)}
      data-testid="automation-pipeline"
      data-active={inView ? 'true' : 'false'}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Automation pipeline: ${stages.map((s) => s.label).join(' to ')}`}
      >
        <defs>
          <linearGradient id="pipeline-trace" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.15" />
            <stop offset="45%" stopColor="var(--accent-vivid)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--accent-tertiary)" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="pipeline-packet">
            <stop offset="0%" stopColor="var(--accent-tertiary)" />
            <stop offset="100%" stopColor="var(--accent-vivid)" stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Rail — the static track the work runs along. */}
        <path
          d={d}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Live trace — draws itself in when the pipeline enters view. */}
        <path
          ref={pathRef}
          className="pipeline-trace"
          d={d}
          fill="none"
          stroke="url(#pipeline-trace)"
          strokeWidth="2.25"
          strokeLinecap="round"
          style={{
            ['--trace-length' as string]: pathLength,
            strokeDasharray: pathLength,
            strokeDashoffset: inView ? 0 : pathLength,
            transition: 'stroke-dashoffset 1500ms var(--ease-out)',
          }}
        />

        {/* Packets — data moving through the system. */}
        {[0, 1, 2].map((packet) => (
          <circle
            key={packet}
            className="pipeline-packet"
            r={compact ? 4.5 : 5.5}
            fill="url(#pipeline-packet)"
            style={{
              offsetPath: `path("${d}")`,
              offsetRotate: '0deg',
              animation: `packet-travel ${7 + packet * 0.9}s linear ${packet * 2.1}s infinite`,
              animationPlayState: playState,
            }}
          />
        ))}

        {/* Stages */}
        {points.map((point, index) => (
          <g key={point.id}>
            <circle
              className="pipeline-halo"
              cx={point.x}
              cy={point.y}
              r="16"
              fill="var(--accent-vivid)"
              style={{
                transformOrigin: `${point.x}px ${point.y}px`,
                animation: `node-halo 7s var(--ease-out) ${index * 0.55}s infinite`,
                animationPlayState: playState,
                opacity: 0,
              }}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="9"
              fill="var(--surface)"
              stroke="var(--border)"
              strokeWidth="1.25"
            />
            <circle
              className="pipeline-node"
              cx={point.x}
              cy={point.y}
              r="4.5"
              fill="var(--accent-primary)"
              style={{
                transformOrigin: `${point.x}px ${point.y}px`,
                animation: `node-activate 7s var(--ease-in-out) ${index * 0.55}s infinite`,
                animationPlayState: playState,
              }}
            />
          </g>
        ))}
      </svg>

      {/* Labels live in HTML, not SVG text: they stay selectable, wrap
          properly, and inherit the type scale instead of being scaled by the
          viewBox.

          They wrap rather than truncate. Five columns inside the hero's right
          half leaves roughly 100px per stage, and "MANUAL PROCESS" in tracked
          mono needs more than that — truncating turned the stage names into
          "MANUAL P…", which is worse than a second line in every respect. */}
      {/* Column count is driven by the stage count, not hard-coded per
          breakpoint: the delivery-lifecycle view has six stages and the
          runtime view has five, and a fixed `lg:grid-cols-5` stranded the
          sixth on a second row, out of step with its node. See
          `.pipeline-legend` in globals.css. */}
      <ul
        className={cn(
          'pipeline-legend mt-3 gap-x-2 gap-y-3 text-center',
          compact && 'grid-cols-5',
        )}
        style={{ ['--stage-count' as string]: stages.length }}
      >
        {stages.map((stage, index) => (
          <li key={stage.id} className="min-w-0">
            <p
              className={cn(
                'font-mono uppercase leading-tight tracking-[0.1em] text-[var(--text-muted)]',
                compact ? 'text-[0.58rem]' : 'text-[0.62rem]',
              )}
            >
              <span className="text-[var(--accent-primary)]">
                {String(index + 1).padStart(2, '0')}
              </span>{' '}
              {stage.label}
            </p>
            {stage.detail && !compact ? (
              <p className="mt-1 text-[0.7rem] leading-tight text-[var(--text-subtle)]">
                {stage.detail}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
