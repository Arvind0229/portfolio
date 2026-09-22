import { sceneImage, scenes } from '@/data/scenes';

/**
 * The mission — one report's path from its sources to every region's inbox,
 * told in five scroll chapters over Arvind's own imagery.
 *
 * ## What it is
 *
 * A tall section with a stage pinned to the viewport. As the visitor scrolls
 * through it, the five images cross-fade and settle in a framed card, the
 * matching caption rises into place beside it, and a progress bar fills. It
 * is the cinematic version of the storyboard further down: this one gives the
 * shape of the work, the storyboard gives one real run step by step.
 *
 * ## Why a card, not full-bleed
 *
 * The first version stretched each image across the whole viewport and then
 * zoomed it in by 14%. The sources are 1024–1505px wide, so on a 1440px laptop
 * that was a 1.3–1.6× upscale, and on a phone, where `object-fit: cover` crops a
 * wide image to a tall screen, far worse. Arvind rightly called them blurred.
 * Framed at up to 880px they are shown at or below their native size, and the
 * settle-in animation now scales *up to* 1, never past it.
 *
 * ## What it says, and what it does not
 *
 * Every sentence is drawn from what Arvind has confirmed: the source types
 * (and that a report uses only the ones it needs), SQL and Python processing,
 * business rules, Excel output, region-wise summaries, pan-India email, and
 * the WhatsApp and SMS APIs integrated in TruBot. There are no numbers — no
 * number here was ever measured. The images are atmosphere, not evidence, so
 * they carry an empty `alt` and the text carries the meaning.
 *
 * ## Why no JavaScript, and why only on Midnight
 *
 * All motion is CSS: `position: sticky` and one named view timeline on the
 * section. Where `animation-timeline` is unsupported, under reduced motion,
 * and below 768px, the same markup lays out as five ordinary stacked
 * chapters, so nothing depends on the animation to be read.
 *
 * It was Midnight-only at first; Arvind asked for it on all four themes, so it
 * is now a self-contained dark band on every theme — a cinematic interlude
 * with its own fixed palette. Images are `loading="lazy"`.
 */

/* Text and images come from `scenes.json`, editable in the admin panel. */
const CHAPTERS = scenes.mission.map((chapter, index) => ({
  ...chapter,
  id: ['mission', 'sources', 'processing', 'report', 'distribution'][index] ?? `chapter-${index}`,
  picture: sceneImage(chapter.image),
}));

export function MissionJourney() {
  return (
    <section
      id="mission"
      aria-labelledby="mission-heading"
      className="cinema"
      style={{ '--cinema-count': CHAPTERS.length } as React.CSSProperties}
    >
      <h2 id="mission-heading" className="sr-only">
        The mission: one report’s path, in five chapters
      </h2>

      <div className="cinema-stage">
        {CHAPTERS.map((chapter, index) => (
          <article
            key={chapter.id}
            className="cinema-chapter"
            style={{ '--i': index } as React.CSSProperties}
            aria-labelledby={`cinema-${chapter.id}`}
          >
            <div className="cinema-frame" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- a plain
                  <img> keeps `loading="lazy"` honest inside a display:none
                  subtree on non-Midnight themes; next/image adds nothing for
                  five pre-sized WebPs. */}
              <img
                src={`/journey/${chapter.picture.src}`}
                srcSet={
                  chapter.picture.small
                    ? `/journey/${chapter.picture.small} 720w, /journey/${chapter.picture.src} ${chapter.picture.width}w`
                    : undefined
                }
                sizes="(min-width: 768px) min(56vw, 880px), 100vw"
                width={chapter.picture.width}
                height={chapter.picture.height}
                alt=""
                loading="lazy"
                decoding="async"
                className="cinema-image"
              />
            </div>
            <div className="cinema-caption">
              <p className="cinema-eyebrow">{chapter.eyebrow}</p>
              <h3 id={`cinema-${chapter.id}`} className="cinema-title">
                {chapter.title}
              </h3>
              <p className="cinema-body">{chapter.body}</p>
            </div>
          </article>
        ))}

        <div className="cinema-progress" aria-hidden="true">
          <span className="cinema-progress-fill" />
        </div>
      </div>
    </section>
  );
}
