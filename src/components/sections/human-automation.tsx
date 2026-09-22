import { sceneImage, scenes } from '@/data/scenes';

/**
 * Human + automation — Arvind's own portrait at his desk with the small robot,
 * brought to life with overlays rather than by moving the picture's parts.
 *
 * ## What actually moves, stated plainly
 *
 * The portrait is one flattened image. Nothing inside it — his face, his hand,
 * the robot's arm — is animated independently, and nothing pretends to be:
 *
 * - **The whole picture** drifts a little against its frame as you scroll
 *   (parallax). Translate only — never scaled, so the face is never distorted
 *   and never enlarged past its native pixels.
 * - **The frame** rises and settles into place on arrival.
 * - **Overlays drawn on top** do the rest: a soft glow that breathes over the
 *   robot's eyes, a workflow path with a pulse travelling along it across the
 *   screen behind him, and three status lights. They are SVG/CSS, positioned
 *   in the picture's own coordinates so they move with it.
 *
 * True part animation — his head, the robot waving — needs the scene as
 * separate transparent layers (background, person, robot, desk). The component
 * is laid out so those can replace the single image without changing the text.
 *
 * ## Why CSS and not Framer Motion
 *
 * Framer Motion is not installed. Everything here is a scroll-linked transform
 * or a looping opacity, which CSS scroll timelines already do on the
 * compositor with no JavaScript — the same mechanism as every other scroll
 * scene on the site. Adding a runtime for effects CSS covers would be a second
 * animation system and bundle weight for no visible gain.
 *
 * ## Content
 *
 * The picture's baked-in words are decoration. What the section says is in
 * the HTML, and it is only what Arvind has confirmed.
 */
export function HumanAutomation() {
  const { eyebrow, title, body, alt } = scenes.human;
  const picture = sceneImage(scenes.human.image);
  // The overlays are drawn in the portrait's own coordinates; on any other
  // picture they would glow over the wrong things, so they only go with it.
  const overlays = picture.id === 'human';
  return (
    <section id="human" aria-labelledby="human-heading" className="human">
      <div className="human-inner">
        <div className="human-copy">
          <p className="cinema-eyebrow">{eyebrow}</p>
          <h2 id="human-heading" className="human-title">
            {title}
          </h2>
          <p className="human-body">{body}</p>
        </div>

        <div
          className="human-frame"
          style={{ aspectRatio: `${picture.width} / ${Math.round(picture.height * 0.93)}` }}
        >
          <div className="human-scene" style={{ aspectRatio: `${picture.width} / ${picture.height}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized
                WebP with a small variant; next/image adds nothing here. */}
            <img
              src={`/journey/${picture.src}`}
              srcSet={
                picture.small
                  ? `/journey/${picture.small} 720w, /journey/${picture.src} ${picture.width}w`
                  : undefined
              }
              sizes="(min-width: 1024px) 760px, 100vw"
              width={picture.width}
              height={picture.height}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="human-image"
            />

            {/* Overlays in the picture's own 1464×1074 coordinates, so they
                stay on their targets at every size and move with the scene. */}
            {overlays ? (
            <svg
              className="human-overlay"
              viewBox="0 0 1464 1074"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="ha-eye">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="ha-path" x1="0" x2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#f5b547" />
                </linearGradient>
              </defs>

              {/* The robot's eyes. */}
              <circle className="human-eye" cx="1020" cy="648" r="34" fill="url(#ha-eye)" />
              <circle className="human-eye" cx="1087" cy="648" r="34" fill="url(#ha-eye)" />

              {/* A workflow path along the bottom of the screen behind him. */}
              <path
                className="human-flow"
                d="M 930 548 C 1040 520, 1140 572, 1240 540 S 1400 520, 1440 548"
                pathLength={1}
                fill="none"
                stroke="url(#ha-path)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                className="human-flow-pulse"
                d="M 930 548 C 1040 520, 1140 572, 1240 540 S 1400 520, 1440 548"
                pathLength={1}
                fill="none"
                stroke="#e0fbff"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Status lights on the monitor's top edge. */}
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  className="human-status"
                  style={{ '--s': i } as React.CSSProperties}
                  cx={905 + i * 30}
                  cy="300"
                  r="8"
                  fill={i === 2 ? '#f5b547' : '#34d399'}
                />
              ))}
            </svg>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
