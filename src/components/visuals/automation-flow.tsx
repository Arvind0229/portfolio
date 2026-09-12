'use client';

import { Icon, type IconName } from '@/components/icons';
import { flowQualities, flowSources, flowStages } from '@/data/automation-flow';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils/cn';

/**
 * The automation graph.
 *
 * A bot at the centre, four systems feeding it from below, a chain of stages
 * running left to right, and charge visibly moving through all of it.
 *
 * ## Why HTML cards over an SVG canvas, rather than one or the other
 *
 * The connectors are SVG, because they are curves with travelling packets and
 * nothing else draws those well. The nodes are HTML, because they are text:
 * as `<text>` they would not wrap, would not respect the visitor's chosen font
 * or type size, would not be selectable, and would read to a screen reader as
 * an undifferentiated string. So the SVG sits behind at `aria-hidden` and
 * carries no information of its own, and the cards are a real ordered list —
 * which is also the accessible description of the diagram, in reading order,
 * with no `aria-label` needed to paper over a picture.
 *
 * Both layers share one coordinate space (the `VIEW` box below) and the cards
 * are positioned as percentages of it, so they scale together with the
 * container and never drift apart at an unexpected width.
 *
 * ## Why the timing is sequential
 *
 * Packets are staggered so one charge appears to travel the chain — sources
 * feed in, the bot fires, then processing, validation, result — on a single
 * 8-second loop. Independent random pulses read as blinking decoration; a
 * staggered chain reads as flow. That is the whole difference between this
 * looking alive and looking busy.
 *
 * ## Cost
 *
 * Every animation is `offset-distance`, `opacity` or `stroke-dashoffset`, so
 * the browser composites them without touching layout. The whole thing pauses
 * via `animation-play-state` when scrolled out of view, and
 * `prefers-reduced-motion` removes the motion entirely — the diagram still
 * reads, because the information is in the cards and the lines, not the
 * movement.
 */

/* One coordinate space, shared by the SVG and the card positions. */
const VIEW = { w: 600, h: 430 } as const;

const STAGE = { y: 134, w: 96, h: 118 } as const;
const STAGE_X = [8, 130, 252, 374, 496] as const;

const SOURCE = { y: 318, w: 92, h: 90 } as const;
const SOURCE_X = [26, 142, 258, 374] as const;

const STAGE_ICONS: Record<string, IconName> = {
  manual: 'document',
  bot: 'bot',
  processing: 'database',
  validation: 'shield',
  result: 'chart',
};

const SOURCE_ICONS: Record<string, IconName> = {
  apis: 'link',
  databases: 'database',
  applications: 'layers',
  reports: 'chart',
};

/** Centre of the bot card — every feed and the overhead arc start here. */
const BOT_CX = STAGE_X[1] + STAGE.w / 2;

/**
 * The connectors, with their place in the cycle.
 *
 * `delay` is where in the 8s loop this segment's packet departs. The values
 * are ordered so the eye follows one charge through: the four sources feed in
 * first, the bot fires, and the chain resolves left to right.
 */
const CYCLE = 8;

interface Connector {
  readonly id: string;
  readonly d: string;
  /** Where in the cycle this segment's packet departs, in seconds. */
  readonly delay: number;
}

const FEEDS: readonly Connector[] = [
  {
    id: 'feed-apis',
    d: `M${BOT_CX} 252 V274 Q${BOT_CX} 290 162 290 H88 Q72 290 72 304 V318`,
    delay: 0.1,
  },
  {
    id: 'feed-databases',
    d: `M${BOT_CX} 252 V286 Q${BOT_CX} 300 188 300 V318`,
    delay: 0.45,
  },
  {
    id: 'feed-applications',
    d: `M${BOT_CX} 252 V274 Q${BOT_CX} 290 194 290 H288 Q304 290 304 304 V318`,
    delay: 0.8,
  },
  {
    id: 'feed-reports',
    d: `M${BOT_CX} 252 V270 Q${BOT_CX} 286 194 286 H404 Q420 286 420 300 V318`,
    delay: 1.15,
  },
];

/** The overhead arc: the fast path from the bot straight to validation. */
const ARC: Connector = {
  id: 'arc',
  d: `M${BOT_CX} 134 V94 Q${BOT_CX} 72 200 72 H400 Q422 72 422 94 V134`,
  delay: 2.0,
};

/** The chain between the stage cards. */
const LINKS: readonly Connector[] = STAGE_X.slice(0, -1).map((x, index) => ({
  id: `link-${index}`,
  d: `M${x + STAGE.w} 193 H${STAGE_X[index + 1] ?? 0}`,
  delay: 1.7 + index * 1.35,
}));

/** Junction beads on the arc and the feeds, timed to the packet passing. */
const JUNCTIONS = [
  { cx: 200, cy: 72, delay: 2.5 },
  { cx: 300, cy: 72, delay: 3.0 },
  { cx: 400, cy: 72, delay: 3.5 },
  { cx: 72, cy: 304, delay: 1.0 },
  { cx: 188, cy: 300, delay: 1.3 },
  { cx: 304, cy: 304, delay: 1.7 },
  { cx: 420, cy: 300, delay: 2.1 },
] as const;

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

export function AutomationFlow({ className }: { className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 });
  // Paused off-screen. A looping animation nobody is looking at is pure cost.
  const play = inView ? 'running' : 'paused';

  const connectors: readonly Connector[] = [...FEEDS, ARC, ...LINKS];

  return (
    <figure
      ref={ref}
      className={cn('relative', className)}
      data-testid="automation-flow"
      data-active={inView ? 'true' : 'false'}
    >
      {/* ---------- Wide layout: the graph ---------- */}
      <div
        className="relative hidden w-full sm:block"
        style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}
      >
        <svg
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          fill="none"
          aria-hidden="true"
          focusable="false"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <filter id="af-glow" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="4.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* The wiring itself — always visible, so the graph still reads when
              nothing is moving (off-screen, or reduced motion).

              Each wire is stroked three times at increasing width and falling
              opacity. That is what a lit filament looks like: a bright core
              inside a soft halo. Measured off the reference, the core there is
              about #32B6D8 with the halo falling to the page ground over
              roughly ten pixels — a single flat 1.6px stroke, which is what
              this had, reads as a drawn line rather than something carrying
              current.

              Three strokes rather than an SVG blur filter on purpose: these
              wires never change, so a filter would buy the same look and cost
              a rasterised offscreen surface for the whole group. Paint is
              cheaper than filter when nothing is moving. */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {connectors.map((connector) => (
              <g key={connector.id}>
                <path
                  d={connector.d}
                  stroke="var(--accent-vivid)"
                  strokeOpacity="0.14"
                  strokeWidth="7"
                />
                <path
                  d={connector.d}
                  stroke="var(--accent-secondary)"
                  strokeOpacity="0.34"
                  strokeWidth="3.4"
                />
                <path
                  d={connector.d}
                  stroke="var(--accent-tertiary)"
                  strokeOpacity="0.85"
                  strokeWidth="1.3"
                />
              </g>
            ))}
          </g>

          {/* Charge in transit. A dash short enough to read as one packet,
              in a gap long enough that the wire is empty between passes. */}
          <g stroke="#DFFAFF" strokeWidth="2.8" strokeLinecap="round" fill="none">
            {connectors.map((connector) => (
              <path
                key={`charge-${connector.id}`}
                d={connector.d}
                className="flow-charge"
                // Normalised length: one packet per wire, travelling the same
                // proportion of it whatever its real length. See the note on
                // `flow-charge` in globals.css.
                pathLength={100}
                strokeDasharray="6 94"
                filter="url(#af-glow)"
                style={{
                  animationDuration: `${CYCLE}s`,
                  animationDelay: `${connector.delay}s`,
                  animationPlayState: play,
                }}
              />
            ))}
          </g>

          {/* Junction beads: they answer as charge reaches them. */}
          <g fill="var(--accent-tertiary)">
            {JUNCTIONS.map((junction) => (
              <g key={`${junction.cx}-${junction.cy}`}>
                <circle cx={junction.cx} cy={junction.cy} r="9" opacity="0.14" />
                <circle cx={junction.cx} cy={junction.cy} r="4.4" opacity="0.42" />
                <circle cx={junction.cx} cy={junction.cy} r="2.4" opacity="1" />
                <circle
                  cx={junction.cx}
                  cy={junction.cy}
                  r="3"
                  className="flow-bead"
                  filter="url(#af-glow)"
                  style={{
                    animationDuration: `${CYCLE}s`,
                    animationDelay: `${junction.delay}s`,
                    animationPlayState: play,
                    transformOrigin: `${junction.cx}px ${junction.cy}px`,
                  }}
                />
              </g>
            ))}
          </g>

          {/* Arrowheads on the chain, so direction is unambiguous. */}
          <g fill="var(--accent-tertiary)" opacity="0.9">
            {STAGE_X.slice(0, -1).map((x, index) => {
              const next = STAGE_X[index + 1] ?? 0;
              return (
                <path
                  key={`head-${index}`}
                  d={`M${next - 9} 188 L${next - 1} 193 L${next - 9} 198 Z`}
                />
              );
            })}
          </g>

          {/* Nub connecting the qualities panel to the graph. */}
          <path
            d="M468 350 H492"
            stroke="var(--accent-tertiary)"
            strokeOpacity="0.6"
            strokeWidth="1.3"
          />
          <circle cx="468" cy="350" r="3" fill="var(--accent-tertiary)" opacity="0.75" />
        </svg>

        {/* ---------- Stage cards ---------- */}
        {/* `display: contents` would be the obvious way to make this list
            lay out nothing, but it strips list semantics in some browsers —
            a long-standing bug, fixed in Chrome, not universally. An absolute
            wrapper gets the same layout with the list intact. */}
        <ol className="absolute inset-0">
          {flowStages.map((stage, index) => (
            <li
              key={stage.id}
              className="absolute"
              style={{
                left: pct(STAGE_X[index] ?? 0, VIEW.w),
                top: pct(STAGE.y, VIEW.h),
                width: pct(STAGE.w, VIEW.w),
                height: pct(STAGE.h, VIEW.h),
              }}
            >
              <NodeCard node={stage} icon={STAGE_ICONS[stage.id]} emphasis={stage.id === 'bot'} />
            </li>
          ))}
        </ol>

        {/* ---------- Source cards ---------- */}
        <ol className="absolute inset-0">
          {flowSources.map((source, index) => (
            <li
              key={source.id}
              className="absolute"
              style={{
                left: pct(SOURCE_X[index] ?? 0, VIEW.w),
                top: pct(SOURCE.y, VIEW.h),
                width: pct(SOURCE.w, VIEW.w),
                height: pct(SOURCE.h, VIEW.h),
              }}
            >
              <NodeCard node={source} icon={SOURCE_ICONS[source.id]} compact />
            </li>
          ))}
        </ol>

        {/* ---------- Qualities ---------- */}
        <div
          className="surface-card absolute flex flex-col justify-center gap-1 p-2.5"
          style={{
            left: pct(492, VIEW.w),
            top: pct(300, VIEW.h),
            width: pct(100, VIEW.w),
            height: pct(108, VIEW.h),
            // The list inside sizes itself in `cqw`, so this panel has to be
            // the query container for it.
            containerType: 'inline-size',
          }}
        >
          <ul className="space-y-0.5">
            {flowQualities.map((quality) => (
              <li
                key={quality}
                className="font-mono text-[clamp(0.46rem,9cqw,0.66rem)] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                {quality}
              </li>
            ))}
          </ul>
          <span
            aria-hidden="true"
            className="mt-1 block h-px w-6"
            style={{ background: 'var(--gradient-signature)' }}
          />
        </div>
      </div>

      {/* ---------- Narrow layout ----------
          Below `sm` the graph would be 60px-wide cards with two-line labels.
          A vertical chain says the same thing legibly, and the charge still
          runs down it, so the page does not lose the idea on a phone. */}
      <ol className="flow-stack space-y-2 sm:hidden">
        {flowStages.map((stage, index) => (
          <li key={stage.id} className="relative">
            <div className="surface-card flex items-center gap-3 p-3">
              <span className="icon-tile h-9 w-9">
                <Icon name={STAGE_ICONS[stage.id] ?? 'sparkle'} size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.86rem] font-medium text-[var(--text-primary)]">
                  {stage.label}
                </span>
                {stage.detail ? (
                  <span className="block text-[0.74rem] text-[var(--text-muted)]">
                    {stage.detail}
                  </span>
                ) : null}
              </span>
            </div>
            {index < flowStages.length - 1 ? (
              /*
                3px wide with a 1px stripe painted inside, not a 1px box.

                `mx-auto` on a 1px element centres it on a half-pixel whenever
                the parent's width is even, and a half-pixel hairline is
                antialiased differently on each repaint — which is a permanent
                shimmer on an element that also animates. The same fault was
                reported on the bulb's chain; this is the other place it lives.
                See `bulb-switch.tsx` for the longer note.
              */
              <span
                aria-hidden="true"
                className="flow-rail relative mx-auto my-1 block h-4 w-[3px]"
                style={{ animationDelay: `${index * 0.5}s`, animationPlayState: play }}
              />
            ) : null}
          </li>
        ))}
      </ol>

      <figcaption className="sr-only">
        How an automation runs: {flowStages.map((stage) => stage.label).join(', then ')}. The bot
        reads from and writes back to {flowSources.map((source) => source.label).join(', ')}.
      </figcaption>
    </figure>
  );
}

function NodeCard({
  node,
  icon,
  emphasis = false,
  compact = false,
}: {
  node: { label: string; detail?: string };
  icon?: IconName;
  emphasis?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'surface-card flow-node flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center',
        emphasis && 'flow-node-active',
      )}
      style={{ containerType: 'inline-size' }}
    >
      {/* The icon sits bare on the card, not inside a bordered tile.
          A tile is right where an icon labels a paragraph — it separates two
          kinds of content. Here the icon *is* the node's face, and boxing it
          put a second border inside a bordered card, which is what made these
          read as small and busy next to the reference.

          Sizes are container-query units, not viewport ones: the card is the
          container, so the icon and the type shrink with the card rather than
          with the window. That keeps the node legible at every hero width
          without a breakpoint per size. */}
      <Icon
        name={icon ?? 'sparkle'}
        size={22}
        className={cn(
          'flow-node-icon',
          compact ? 'h-[34cqw] w-[34cqw]' : 'h-[36cqw] w-[36cqw]',
        )}
      />
      <span className="block px-0.5 text-[clamp(0.5rem,11cqw,0.88rem)] font-medium leading-[1.15] text-[var(--text-primary)]">
        {node.label}
      </span>
      {node.detail && !compact ? (
        <span className="block px-0.5 text-[clamp(0.4rem,7.6cqw,0.66rem)] leading-[1.15] text-[var(--text-muted)]">
          {node.detail}
        </span>
      ) : null}
    </div>
  );
}
