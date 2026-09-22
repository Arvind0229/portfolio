import { profile } from '@/data/profile';
import { sceneImage, scenes } from '@/data/scenes';

/**
 * The closing frame of the build sequence: the finished robot looking out over
 * the city and the road ahead. It carries the one thing on the site that is
 * about the future — what Arvind is learning — and says plainly that it is
 * learning, not shipped work. It renders nothing if `profile.exploring` is
 * empty. A dark band on every theme.
 */
export function NextChapter() {
  const { eyebrow, title, body, cta } = scenes.closing;
  const picture = sceneImage(scenes.closing.image);
  if (!profile.exploring && !body) return null;
  return (
    <section
      aria-labelledby="next-chapter-heading"
      className="next-chapter"
      style={{ backgroundImage: `url('/journey/${picture.src}')` }}
    >
      <div className="next-chapter-copy">
        <p className="cinema-eyebrow">{eyebrow}</p>
        <h2 id="next-chapter-heading" className="next-chapter-title">
          {title}
        </h2>
        {body ? <p className="next-chapter-body">{body}</p> : null}
        {profile.exploring ? (
          <>
            <p className="next-chapter-body">What I am learning now: {profile.exploring}.</p>
            {/* The profile text already says it is self-learning; the tag
                makes that visible at a glance without repeating it. */}
            <span className="next-chapter-tag">Learning</span>
          </>
        ) : null}
        <a href="#contact" className="landing-cue next-chapter-cta">
          <span>{cta}</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
