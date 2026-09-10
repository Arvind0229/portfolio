import Image from 'next/image';
import { profile } from '@/data/profile';

/**
 * Arvind's portrait, in the two shapes the site actually needs.
 *
 * ## Why two named exports rather than one component with a `variant` prop
 *
 * A framed card and a round avatar share exactly one thing — the source data —
 * and nothing else: different aspect ratio, different loading priority,
 * different caption, different `sizes`, different alt semantics. A `variant`
 * union would mean a props type where half the fields are meaningless for half
 * the values, which is the shape that grows `if (variant === ...)` branches.
 * Two small functions reading one `profile.photo` keep the single source of
 * truth without the union.
 *
 * ## What both do
 *
 * `next/image` rather than `<img>`, so each viewport is served a file sized for
 * it in AVIF or WebP instead of the 1081px JPEG, and the box is reserved from
 * the declared intrinsic size so the page never reflows when the photo lands.
 * The blur placeholder is inlined as a data URI (see `ProfilePhoto`), so there
 * is something in the frame from the first paint rather than a hole.
 *
 * Neither is a link, and neither reacts to hover: a photograph is not a
 * control, and hover motion on something you cannot click is decoration
 * pretending to be feedback.
 *
 * ## The frame
 *
 * The card is wrapped in `.portrait-frame`, which draws a slowly orbiting
 * light around the edge, a scan band crossing the photograph, and corner ticks
 * — the same HUD vocabulary the rest of the site speaks. It re-themes for free
 * because every part of it reads from `--accent-*`, which each theme already
 * redefines; there is no per-theme branch here or in the CSS. The mechanics,
 * and why the ring is a rotated square rather than an animated gradient angle,
 * are in `globals.css`.
 */

/**
 * The framed portrait, for the profile page.
 *
 * `priority` is deliberate and narrow: on `/about` this sits high in the first
 * viewport, so leaving it lazy costs a visible pop-in on the one page whose
 * subject is the person. Everywhere else the photo is small and below the fold,
 * and lazy is correct — which is why this is a prop rather than a default.
 */
export function PortraitCard({ priority = false }: { priority?: boolean }) {
  const { photo } = profile;

  return (
    /*
      The width cap below `lg` is not cosmetic. Until the two-column grid kicks
      in, this card is the full width of the content column — which on a tablet
      is about 700px, and a 4:5 box at that width is an 875px-tall billboard of
      someone's face before a single fact about him. (That is what it did; the
      assertions all passed and a screenshot at 768 is what showed it.) Capping
      at 20rem keeps it a portrait at every stacked width, and `lg:max-w-none`
      hands the full sidebar column back once there is a column to fill.
    */
    <div className="portrait-frame mx-auto max-w-[20rem] lg:mx-0 lg:max-w-none">
      <figure className="surface-card overflow-hidden">
        {/*
          A fixed 4:5 box with `fill` + `object-cover`, rather than letting the
          image size itself: the card sits in a column whose width changes at
          every breakpoint, and a fixed ratio is what stops the sidebar height
          from jumping between them.
        */}
        <div className="portrait-shot aspect-[4/5] w-full">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            /* Measured off the layout rather than guessed: from `lg` the card
               occupies the narrow column of a 1.45fr/1fr grid inside a 76rem
               shell (~420px), and below that it is pinned to the 20rem cap
               above. Overstating this ships bytes nobody can see. */
            sizes="(min-width: 1024px) 420px, 320px"
            placeholder="blur"
            blurDataURL={photo.blurDataURL}
            priority={priority}
            className="object-cover"
          />

          {/* The frame's moving parts. Both are decoration over a photograph,
              so both are hidden from the accessibility tree — and both are
              inside the crop window rather than over the caption, because a
              scan band crossing his name would read as a rendering fault. */}
          <span aria-hidden="true" className="portrait-scan" />
          <span aria-hidden="true" className="portrait-ticks" />
        </div>

      {/*
        A caption, so the card still says who this is when it is screenshotted,
        shared, or met by someone who arrived mid-page. `figcaption` rather than
        a `div` because that is precisely what this is.
      */}
        <figcaption className="border-t border-[var(--border-subtle)] px-5 py-4">
          <p className="font-display text-[1.02rem] text-[var(--text-primary)]">
            {profile.name}
          </p>
          <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {profile.title} · {profile.location.split('—')[0]?.trim()}
          </p>
        </figcaption>
      </figure>
    </div>
  );
}

/**
 * The round avatar, for places where a face helps recall but is not the point
 * — the contact panel, where it sits beside the details it belongs to.
 *
 * A square crop of a 4:5 portrait lands on the collar if you simply centre it,
 * so the crop is steered by `facePosition` from the data rather than by a magic
 * number buried in this file.
 */
export function PortraitAvatar({ size = 72 }: { size?: number }) {
  const { photo } = profile;

  return (
    <Image
      src={photo.src}
      /* Decorative here, and empty on purpose: the name this would announce is
         written in text immediately beside it, and a second announcement is
         noise rather than information. */
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      sizes={`${size * 2}px`}
      placeholder="blur"
      blurDataURL={photo.blurDataURL}
      className="shrink-0 rounded-full border border-[var(--border-subtle)] object-cover"
      style={{ objectPosition: photo.facePosition, width: size, height: size }}
    />
  );
}
