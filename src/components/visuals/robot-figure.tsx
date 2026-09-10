/**
 * The automation companion.
 *
 * Redrawn from the wireframe schematic it used to be. Arvind's reference is a
 * friendly white android — rounded shell, a dark visor with two large glowing
 * eyes, a badge on the chest — rather than a technical diagram of a humanoid,
 * and he is right that the two say different things. A wireframe reads as an
 * engineering drawing; this reads as the thing the automations *are*.
 *
 * ## What is fixed and what follows the theme
 *
 * The shell is a fixed material: white plastic with grey shading. That is not
 * an oversight — a robot whose body changes colour with the site's accent stops
 * looking like an object and starts looking like a UI element, and the whole
 * point of the figure is that it is a *thing* standing behind the glass.
 *
 * Everything that emits light — eyes, visor bloom, chest badge, antenna tip,
 * joint rings — is drawn from `--accent-tertiary` and `--accent-secondary`, so
 * the figure is lit by the theme even though it is not painted by it. Switch to
 * Studio and the same robot glows amber.
 *
 * ## Motion
 *
 * A slow float, a blink on a long cycle, a pulse in the chest badge and the
 * antenna, and a scan band down the visor. All `transform` and `opacity`, so
 * the compositor handles them and layout never runs. Every one is switched off
 * outright under `prefers-reduced-motion` — see the block in `globals.css`;
 * shortening them is not the same thing, because a delayed animation still
 * fires when its delay elapses.
 */
export function RobotFigure({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* The shell. Three stops rather than two: a plastic body has a bright
            top, a broad mid tone and a sharp fall-off at the bottom edge, and
            a straight two-stop ramp reads as flat card stock instead. */}
        <linearGradient id="rf-shell" x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Surfaces turned away from the light — the far arm, the underside of
            the jaw, the shadowed side of the torso. */}
        <linearGradient id="rf-shell-far" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* The visor is glass over a dark cavity, not a painted panel. */}
        <linearGradient id="rf-visor" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#0f1b2d" />
          <stop offset="55%" stopColor="#050a12" />
          <stop offset="100%" stopColor="#0a1220" />
        </linearGradient>

        <radialGradient id="rf-eye" cx="0.5" cy="0.42" r="0.65">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="var(--accent-tertiary)" />
          <stop offset="100%" stopColor="var(--accent-secondary)" />
        </radialGradient>

        <radialGradient id="rf-bloom" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--accent-tertiary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent-tertiary)" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="rf-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" />
          <stop offset="100%" stopColor="var(--accent-secondary)" />
        </linearGradient>

        <filter id="rf-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="rf-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>

        {/* The visor scan is clipped to the visor so the band cannot escape
            across the face — a highlight sliding over the cheek reads as a
            rendering fault rather than as a screen refreshing. */}
        <clipPath id="rf-visor-clip">
          <rect x="72" y="96" width="116" height="66" rx="26" />
        </clipPath>
      </defs>

      {/* Everything drifts together, so the figure moves as one object rather
          than as a head bobbing on a static body. */}
      <g className="robot-float">
        {/* Ambient bloom behind the head — the light the eyes throw onto the
            air around them. Drawn first so the shell sits on top of it. */}
        <ellipse cx="130" cy="126" rx="96" ry="74" fill="url(#rf-bloom)" opacity="0.5" />

        {/* ---- Arms. Drawn before the torso so the shoulders overlap them,
                which is what puts them behind the body rather than glued on. */}
        <g>
          {/*
            The arms sit *against* the torso, overlapping its edge by a few
            units. Set even slightly clear of it they stop reading as limbs and
            become two floating pills either side of a body — which is exactly
            what the first version did.
          */}
          {/* Far arm — shaded, and slightly narrower for depth. */}
          <rect x="52" y="240" width="28" height="88" rx="14" fill="url(#rf-shell-far)" />
          <circle cx="66" cy="244" r="19" fill="url(#rf-shell-far)" />
          <circle
            cx="66"
            cy="244"
            r="8.5"
            fill="none"
            stroke="var(--accent-secondary)"
            strokeWidth="1.6"
            opacity="0.55"
          />
          {/* Near arm. */}
          <rect x="180" y="240" width="30" height="90" rx="15" fill="url(#rf-shell)" />
          <circle cx="195" cy="244" r="20" fill="url(#rf-shell)" />
          <circle
            cx="195"
            cy="244"
            r="9"
            fill="none"
            stroke="var(--accent-tertiary)"
            strokeWidth="1.8"
            opacity="0.75"
          />
        </g>

        {/* ---- Torso */}
        <path
          d="M78 232 Q78 214 100 210 L160 210 Q182 214 182 232 L182 330 Q182 356 156 358 L104 358 Q78 356 78 330 Z"
          fill="url(#rf-shell)"
        />
        {/* The shadowed left flank. A single body fill makes the torso read as
            a flat cutout; this is what gives it a round front. */}
        <path
          d="M78 232 Q78 214 100 210 L114 210 Q96 220 96 240 L96 336 Q96 352 112 357 L104 358 Q78 356 78 330 Z"
          fill="#94a3b8"
          opacity="0.55"
        />

        {/* Chest badge — the one place his initials appear on the figure. */}
        <circle cx="130" cy="268" r="30" fill="#0f1b2d" opacity="0.9" />
        <circle
          cx="130"
          cy="268"
          r="30"
          fill="none"
          stroke="url(#rf-badge)"
          strokeWidth="2.6"
          className="robot-core"
        />
        <text
          x="130"
          y="277"
          textAnchor="middle"
          fontSize="21"
          fontWeight="700"
          fill="var(--accent-tertiary)"
          fontFamily="var(--font-display, ui-sans-serif), system-ui, sans-serif"
          letterSpacing="0.5"
        >
          AG
        </text>

        {/* Two status lines under the badge: the smallest possible hint that
            something inside is running. */}
        <rect x="106" y="312" width="48" height="4" rx="2" fill="#94a3b8" opacity="0.5" />
        <rect
          x="106"
          y="312"
          width="26"
          height="4"
          rx="2"
          fill="var(--accent-tertiary)"
          className="robot-beacon"
        />
        <rect x="112" y="324" width="36" height="3" rx="1.5" fill="#94a3b8" opacity="0.35" />

        {/* ---- Neck */}
        <rect x="116" y="188" width="28" height="26" rx="10" fill="url(#rf-shell-far)" />

        {/* ---- Side pods, behind the head so the shell overlaps them. */}
        <g>
          <rect x="46" y="112" width="26" height="42" rx="13" fill="url(#rf-shell-far)" />
          <circle cx="59" cy="133" r="7" fill="var(--accent-secondary)" opacity="0.7" />
          <rect x="188" y="112" width="26" height="42" rx="13" fill="url(#rf-shell)" />
          <circle
            cx="201"
            cy="133"
            r="7"
            fill="var(--accent-tertiary)"
            opacity="0.85"
            className="robot-beacon"
          />
        </g>

        {/* ---- Head */}
        <rect x="58" y="70" width="144" height="122" rx="46" fill="url(#rf-shell)" />
        {/* Shadow along the underside of the jaw. */}
        <path
          d="M64 158 Q84 192 130 192 Q176 192 196 158 Q176 178 130 178 Q84 178 64 158 Z"
          fill="#64748b"
          opacity="0.45"
        />
        {/* Specular highlight across the brow — the single mark that makes the
            shell read as moulded plastic rather than as a filled rectangle. */}
        <path
          d="M76 92 Q104 76 150 80"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.85"
          filter="url(#rf-soft)"
        />

        {/* ---- Visor */}
        <rect x="72" y="96" width="116" height="66" rx="26" fill="url(#rf-visor)" />
        <rect
          x="72"
          y="96"
          width="116"
          height="66"
          rx="26"
          fill="none"
          stroke="var(--accent-secondary)"
          strokeWidth="1.4"
          opacity="0.5"
        />

        {/* Eyes. Two shapes each: the lit iris, and a wider soft copy behind it
            that is the light spilling onto the glass. */}
        <g className="robot-eyes">
          <ellipse cx="106" cy="129" rx="17" ry="19" fill="url(#rf-eye)" filter="url(#rf-glow)" />
          <ellipse cx="154" cy="129" rx="17" ry="19" fill="url(#rf-eye)" filter="url(#rf-glow)" />
          <ellipse cx="101" cy="122" rx="5" ry="6" fill="#ffffff" opacity="0.9" />
          <ellipse cx="149" cy="122" rx="5" ry="6" fill="#ffffff" opacity="0.9" />
        </g>

        {/* A refresh passing down the visor, clipped to it. */}
        <g clipPath="url(#rf-visor-clip)">
          <rect
            x="72"
            y="90"
            width="116"
            height="14"
            fill="var(--accent-tertiary)"
            opacity="0.18"
            className="robot-scan"
          />
        </g>

        {/* ---- Antenna */}
        <rect x="127" y="46" width="6" height="26" rx="3" fill="url(#rf-shell-far)" />
        <circle
          cx="130"
          cy="42"
          r="8"
          fill="var(--accent-tertiary)"
          filter="url(#rf-glow)"
          className="robot-beacon"
        />
      </g>
    </svg>
  );
}
