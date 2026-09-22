/**
 * The site's loader: a tiny automation run.
 *
 * Three nodes (a source, a bot, a report) sit on a line. A packet travels
 * between them, each node lights as the packet arrives, and the caption
 * changes in step: fetching, processing, delivering. It suits an RPA
 * portfolio better than a spinner, and it is drawn in the theme's own accent.
 *
 * Below it, a skeleton of the page (a title and three cards) shimmers, so the
 * layout does not jump when the content arrives. CSS only (PIPELINE LOADER in
 * globals.css). Under reduced motion the packet sits still and the words stay.
 */
export function PipelineLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="pl-wrap" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div className="pl-run" aria-hidden="true">
        <span className="pl-line" />
        <span className="pl-packet" />
        <span className="pl-node" data-n="0">
          <span className="pl-node-core" />
        </span>
        <span className="pl-node" data-n="1">
          <span className="pl-node-core" />
        </span>
        <span className="pl-node" data-n="2">
          <span className="pl-node-core" />
        </span>
      </div>
      <p className="pl-caption" aria-hidden="true">
        <span>Fetching…</span>
        <span>Processing…</span>
        <span>Delivering…</span>
      </p>
      <Skeleton />
    </div>
  );
}

/** Shimmering placeholders in the shape of a page. Reused by other loaders. */
export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="sk-page" aria-hidden="true">
      <span className="sk sk-eyebrow" />
      <span className="sk sk-title" />
      <span className="sk sk-line" />
      <span className="sk sk-line sk-short" />
      <div className="sk-cards">
        {Array.from({ length: cards }, (_, n) => (
          <span key={n} className="sk sk-card" />
        ))}
      </div>
    </div>
  );
}
