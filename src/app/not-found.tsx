import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-[76rem] flex-col justify-center px-5 py-24 sm:px-8">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[var(--accent-primary)]">
        404
      </p>
      <h1 className="mt-3 text-[clamp(1.8rem,5vw,3rem)]">That page isn&apos;t here</h1>
      <p className="mt-4 max-w-lg text-[0.98rem] leading-relaxed text-[var(--text-secondary)]">
        The portfolio lives on a single page. Head back to the start and everything — experience,
        projects, the assistant — is a scroll away.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 py-3 text-[0.9rem] font-medium text-[var(--accent-contrast)]"
        >
          Back to the portfolio
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
