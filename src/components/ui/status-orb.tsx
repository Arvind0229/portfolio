/**
 * One animated status mark, used wherever the site waits on something real:
 * the admin sign-in check, a download, and the error pages.
 *
 * - `checking`: three dots pulse.
 * - `working`: a ring fills to `progress`; with no progress it spins instead.
 * - `success`: the ring closes and a check mark draws itself.
 * - `error`: a cross draws itself and the orb shakes once.
 *
 * It is drawn in SVG and animated in CSS (STATUS ORB in globals.css), in the
 * theme's own colours. Success is a fixed green and error a fixed red, because
 * those colours mean the same thing on every theme. It only ever shows the
 * state it is given: the caller decides when something has actually
 * succeeded, so it can never show a success that did not happen.
 */
export type OrbState = 'idle' | 'checking' | 'working' | 'success' | 'error';

export function StatusOrb({
  state,
  progress,
  size = 64,
  className,
}: {
  state: OrbState;
  /** 0–100. Leave out when the length of the wait is unknown. */
  progress?: number;
  size?: number;
  className?: string;
}) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const known = typeof progress === 'number' && Number.isFinite(progress);
  const fill = state === 'success' ? 1 : known ? Math.max(0, Math.min(100, progress)) / 100 : 0.28;

  return (
    <span
      className={['status-orb', className].filter(Boolean).join(' ')}
      data-state={state}
      data-indeterminate={state === 'working' && !known ? 'true' : undefined}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <circle className="orb-track" cx="24" cy="24" r={r} />
        <circle
          className="orb-ring"
          cx="24"
          cy="24"
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fill)}
        />
        <g className="orb-dots">
          <circle cx="17" cy="24" r="2" />
          <circle cx="24" cy="24" r="2" />
          <circle cx="31" cy="24" r="2" />
        </g>
        <path className="orb-check" d="M16 24.5 l5.5 5.5 L32.5 18.5" pathLength={1} />
        <path className="orb-cross" d="M18 18 L30 30 M30 18 L18 30" pathLength={1} />
      </svg>
      <span className="orb-sparks">
        <span />
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}
