import type { SVGProps } from 'react';

/**
 * The icon set.
 *
 * Eighteen icons, drawn inline, rather than a dependency. `lucide-react` is
 * the obvious alternative and a good library, but it ships ~1,500 icons and
 * the tree-shaking only holds if every import stays a named one — one lazy
 * `import * as Icons` anywhere and the whole set lands in the bundle. For
 * eighteen shapes on a portfolio, the dependency buys convenience and costs a
 * supply-chain surface, a version to keep current and a bundle risk. Inline
 * SVG costs about 120 bytes each and nothing else.
 *
 * All of them share one geometry — 24×24 box, 1.6 stroke, round caps and
 * joins, `currentColor` — so they sit together without looking assembled from
 * different sets, and they inherit colour from the tile they are placed in.
 *
 * Every icon here is decorative: it repeats a label that is already in the
 * text beside it. So the wrapper is `aria-hidden` and has `focusable="false"`
 * (IE/Edge legacy still puts SVGs in the tab order without it), and no icon
 * carries a title. An icon that ever becomes the only label must be given a
 * real accessible name at the call site instead.
 */

export type IconName =
  | 'bot'
  | 'bolt'
  | 'database'
  | 'users'
  | 'shield'
  | 'chart'
  | 'mail'
  | 'phone'
  | 'whatsapp'
  | 'search'
  | 'linkedin'
  | 'github'
  | 'pin'
  | 'document'
  | 'gear'
  | 'link'
  | 'code'
  | 'layers'
  | 'check'
  | 'sparkle'
  | 'graduation';

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

const PATHS: Record<IconName, React.ReactNode> = {
  bot: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4.5M9 14h.01M15 14h.01M9.5 17.5h5" />
      <path d="M2 13.5v2M22 13.5v2" />
    </>
  ),
  bolt: <path d="M13.5 2 4 13.5h6.5L10 22l9.5-11.5H13L13.5 2Z" />,
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3.2" />
      <path d="M4 6v6c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2V6" />
      <path d="M4 12v6c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2v-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6M17 14.3a6.2 6.2 0 0 1 4.2 5.7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8 4.5 5.8v5.6c0 4.6 3.1 8.3 7.5 9.8 4.4-1.5 7.5-5.2 7.5-9.8V5.8L12 2.8Z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M7 20.5v-6M12 20.5V8M17 20.5v-9" />
    </>
  ),
  mail: (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.4" />
      <path d="m3.4 7 8.6 6 8.6-6" />
    </>
  ),
  phone: (
    <path d="M21 16.6v2.6a1.8 1.8 0 0 1-2 1.8 17.6 17.6 0 0 1-7.7-2.7 17.3 17.3 0 0 1-5.3-5.3A17.6 17.6 0 0 1 3.3 5.2 1.8 1.8 0 0 1 5.1 3.2h2.6a1.8 1.8 0 0 1 1.8 1.6c.1.9.3 1.7.6 2.5a1.8 1.8 0 0 1-.4 1.9L8.6 10.3a14.2 14.2 0 0 0 5.1 5.1l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.6.5 2.5.6a1.8 1.8 0 0 1 1.6 1.9Z" />
  ),
  /*
     Drawn in the same single-stroke style as every other icon here rather than
     pasted from WhatsApp's brand kit: a brand asset carries usage terms a
     portfolio has no need to take on, and a filled glyph would be the one shape
     in this set that is not a stroke. It is a speech bubble with a handset in
     it — recognisable in context, and unmistakably part of this icon set.

     The *colour* is a separate question, and the answer changed. This glyph
     used to inherit the theme's text colour on the grounds that one green icon
     would break the set. In place that made it just another grey mark in a row
     of grey marks, and green is the whole reason people recognise WhatsApp
     without reading the label. It now takes `--whatsapp` at its two call sites
     — the resume button and the contact card — while every other use of this
     path still inherits. See that token in globals.css for the two values and
     what each was measured against.
  */
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.5 11.7a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.4-4.6a8.4 8.4 0 1 1 15.6-4.2Z" />
      <path d="M9.3 8.6c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.4l.8 1.8c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6a6 6 0 0 0 2.8 2.4c.3.1.5.1.6-.1l.5-.6c.2-.2.3-.2.5-.1l1.7.9c.2.1.4.2.4.4v.5c0 .3-.2.7-.6.9a2.6 2.6 0 0 1-1.6.3 8.5 8.5 0 0 1-5.6-4.5 3.3 3.3 0 0 1-.6-1.8c0-.7.3-1.2.6-1.5Z" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10.5V17M7.5 7.2v.01M11.6 17v-6.5M11.6 13.4c0-1.7 1-2.9 2.6-2.9s2.4 1.1 2.4 2.9V17" />
    </>
  ),
  github: (
    <path d="M9.2 20.4v-2.6c-3 .6-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.4-.3-4.9-1.2-4.9-5.4 0-1.2.4-2.2 1.1-2.9-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3 1.1a10.4 10.4 0 0 1 5.5 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.7 1.1 1.7 1.1 2.9 0 4.2-2.5 5.1-4.9 5.4.4.3.8 1 .8 2.1v3.4" />
  ),
  pin: (
    <>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  document: (
    <>
      <path d="M14 2.8H7.2a2.4 2.4 0 0 0-2.4 2.4v13.6a2.4 2.4 0 0 0 2.4 2.4h9.6a2.4 2.4 0 0 0 2.4-2.4V8l-5.2-5.2Z" />
      <path d="M14 2.8V8h5.2M8.6 13h6.8M8.6 16.6h4.4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0V20a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H4a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3H10a1.5 1.5 0 0 0 .9-1.4V4a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6H20a1.5 1.5 0 0 0-1.4.9Z" />
    </>
  ),
  link: (
    <>
      <path d="M10.2 13.8a4 4 0 0 0 6 .4l2.4-2.4a4 4 0 0 0-5.6-5.6l-1.4 1.3" />
      <path d="M13.8 10.2a4 4 0 0 0-6-.4l-2.4 2.4a4 4 0 0 0 5.6 5.6l1.4-1.3" />
    </>
  ),
  code: <path d="m8.4 17.4-5-5.4 5-5.4M15.6 6.6l5 5.4-5 5.4M13.6 4.2l-3.2 15.6" />,
  layers: (
    <>
      <path d="m12 2.8 9 4.6-9 4.6-9-4.6 9-4.6Z" />
      <path d="m3 12.4 9 4.6 9-4.6M3 16.8l9 4.6 9-4.6" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  sparkle: (
    <path d="M12 2.8 13.9 9l6.2 1.9-6.2 1.9L12 19.2l-1.9-6.4L3.9 11 10.1 9 12 2.8ZM19 3v3.4M20.7 4.7h-3.4" />
  ),
  graduation: (
    <>
      <path d="m12 3.2 9.4 4.6L12 12.4 2.6 7.8 12 3.2Z" />
      <path d="M6.6 10v5.4c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9V10" />
      <path d="M21.4 7.8v5.6" />
    </>
  ),
};

export function Icon({ name, size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * Icon in a tile — the motif the design uses at the head of most cards.
 *
 * The tile is a separate surface from the card, one step brighter, so the two
 * never merge into a single wash. `.icon-tile` carries the look; this
 * component only fixes the geometry so tiles stay the same size everywhere.
 */
export function IconTile({
  name,
  size = 'md',
  className,
  style,
}: {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * For setting `--icon-tint` on a single tile — a service that owns a colour,
   * such as WhatsApp. Going through the token the stylesheet already reads
   * keeps one rule in charge of the glyph colour.
   */
  style?: React.CSSProperties;
}) {
  const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const glyph = size === 'sm' ? 15 : size === 'lg' ? 22 : 18;
  return (
    <span className={['icon-tile', box, className].filter(Boolean).join(' ')} style={style}>
      <Icon name={name} size={glyph} />
    </span>
  );
}
