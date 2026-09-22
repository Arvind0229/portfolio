import { sceneImage, scenes } from '@/data/scenes';

/**
 * The build — a robot assembled in five scroll stages, each one a stage of how
 * Arvind actually delivers an automation.
 *
 * ## Why the robot is assembling
 *
 * The five frames (parts → assembly → integration → power-up → ready) come
 * from Arvind's storyboard, and they map one-to-one onto the delivery
 * lifecycle he has confirmed: requirement and BRD, development, integration
 * with the data and the APIs, testing and UAT, then production and support.
 * The picture is the metaphor; the words are the facts.
 *
 * ## Images
 *
 * Arvind supplied each stage as a full-size frame. Only the robot in the
 * middle is used — every baked-in title, checklist, button and "impact"
 * panel was cropped away (those panels claimed "better accuracy" and
 * "reduced manual effort", which were never measured). Each crop is 476×620
 * and the frame is never shown taller than 560px, so no pixel is enlarged.
 *
 * ## Motion, and when there is none
 *
 * CSS only, on one named view timeline: the stage pins, the frames
 * cross-fade, the caption for each stage rises and lifts, the step rail
 * fills and lights the current step. A dark cinematic band on every theme
 * (Arvind asked for all four); images are lazy. Under reduced motion, below 768px, or without
 * scroll-driven animation it is five ordinary stacked cards.
 */

/* Text and images come from `scenes.json`, editable in the admin panel. */
const STAGES = scenes.build.stages.map((stage, index) => ({
  ...stage,
  n: String(index + 1).padStart(2, '0'),
  picture: sceneImage(stage.image),
}));

export function AssemblySequence() {
  return (
    <section id="build" aria-labelledby="build-heading" className="assembly">
      <div className="assembly-stage">
        <div className="assembly-head">
          <p className="cinema-eyebrow">{scenes.build.eyebrow}</p>
          <h2 id="build-heading" className="assembly-heading">
            {scenes.build.title}
          </h2>
          <ol className="assembly-rail" aria-hidden="true">
            {STAGES.map((stage) => (
              <li key={stage.n} className="assembly-rail-step">
                <span className="assembly-rail-dot" />
                <span className="assembly-rail-label">{stage.step}</span>
              </li>
            ))}
          </ol>
        </div>

        <ol className="assembly-list">
          {STAGES.map((stage) => {
            return (
              <li key={stage.n} className="assembly-item">
                <div className="assembly-frame" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized
                      WebPs, lazy inside a subtree hidden on other themes. */}
                  <img
                    src={`/journey/${stage.picture.src}`}
                    width={stage.picture.width}
                    height={stage.picture.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="assembly-caption">
                  <p className="assembly-n">
                    {stage.n} <span>/ {String(STAGES.length).padStart(2, '0')} · {stage.step}</span>
                  </p>
                  <h3 className="assembly-title">{stage.title}</h3>
                  <p className="assembly-body">{stage.body}</p>
                  <p className="assembly-detail">{stage.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
