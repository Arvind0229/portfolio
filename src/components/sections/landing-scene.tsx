import { profile } from '@/data/profile';
import { sceneImage, scenes } from '@/data/scenes';

/**
 * The landing frame: Arvind's own image — documents and data flowing along a
 * path into a bot at the centre, out to reports, a globe and a city — full
 * screen, before anything else. Scrolling lifts the words away, eases the
 * picture in slightly and fades it out as the hero arrives.
 *
 * ## Why this image, and why not the storyboard panels
 *
 * The storyboard panels are crops of one 1536×1024 composite — about 384×289
 * pixels each — upscaled ten times. Upscaling adds pixels, not detail, which is
 * why they looked blurred; nothing in the pipeline can fix that. This image is
 * a single 1672×941 frame with no baked-in claims or fake figures, so it is
 * used at its native resolution and never scaled past it by more than the 6%
 * the scroll adds.
 *
 * ## Why a CSS background rather than an `<img>`
 *
 * The picture is decoration and the words carry the meaning, so it is a
 * background rather than content. It shows on all four themes as a dark
 * opening frame — Arvind asked for the cinematic scenes on every theme.
 *
 * ## Motion
 *
 * On load the words rise in and the cue pulses. On scroll, one named view
 * timeline drives the rest — `transform` and `opacity` only, no JavaScript.
 * Without scroll-driven animation, or under reduced motion, it is a still,
 * full-screen opening frame.
 *
 * ## The name
 *
 * The hero directly below carries the page's one `<h1>`. The name here is
 * visible but hidden from assistive technology, so a screen reader does not
 * announce it twice in a row.
 */
/**
 * Five stages of one automation, cut from Arvind's second storyboard. Only the
 * picture area of each panel is used — its baked-in titles are cropped away —
 * and the labels below are real text, from confirmed facts. Each crop is about
 * 300×284px and is shown at or below that, so it stays sharp.
 */
const STAGES = [
  { n: '01', title: 'The bot', detail: 'Datamatics TruBot' },
  { n: '02', title: 'Sources', detail: 'SFTP · FTP · S3 · Database' },
  { n: '03', title: 'Processing', detail: 'SQL · Python · Excel & VBA' },
  { n: '04', title: 'APIs', detail: 'WhatsApp · SMS · ID creation & deactivation' },
  { n: '05', title: 'Delivery', detail: 'MIS reports · Email distribution' },
] as const;

export function LandingScene() {
  const image = sceneImage(scenes.landing.image);
  return (
    <section id="landing" aria-label="Opening" className="landing">
      <div className="landing-stage">
        <div
          className="landing-image"
          aria-hidden="true"
          style={{ backgroundImage: `url('/journey/${image.src}')` }}
        />
        <div className="landing-shade" aria-hidden="true" />

        <div className="landing-copy">
          <p className="landing-eyebrow">
            {profile.title} · Banking, NBFC &amp; Retail Lending
          </p>
          <p className="landing-name" aria-hidden="true">
            {profile.name}
          </p>
          <p className="landing-tagline">{scenes.landing.tagline}</p>
          <a href="#top" className="landing-cue">
            <span>Scroll to explore</span>
            <span aria-hidden="true" className="landing-cue-arrow">
              ↓
            </span>
          </a>
        </div>

        {/* Decorative picture strip; the words are the content, so the
            list is labelled and each image is alt="". Hidden below 1024px,
            where there is no room for it beside the words. */}
        <ol className="landing-stages" aria-label="One automation, in five stages">
          {STAGES.map((stage, index) => (
            <li
              key={stage.n}
              className="landing-stage-card"
              style={{ '--k': index } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- five
                  ~20 KB pre-sized WebPs; next/image adds nothing here. */}
              <img
                src={`/journey/stage-${index + 1}.webp`}
                alt=""
                width={300}
                height={284}
                loading="lazy"
                decoding="async"
                className="landing-stage-image"
              />
              <span className="landing-stage-label">
                <span className="landing-stage-n">{stage.n}</span>
                <span className="landing-stage-title">{stage.title}</span>
                <span className="landing-stage-detail">{stage.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
