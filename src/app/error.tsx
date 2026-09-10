'use client';

import { useEffect } from 'react';

/**
 * Route error boundary. The visitor gets a plain explanation and a way
 * forward; the digest is logged, never rendered. No stack trace reaches the
 * page in any environment.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] render error', { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-[76rem] flex-col justify-center px-5 py-24 sm:px-8">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[var(--error)]">
        Something broke
      </p>
      <h1 className="mt-3 text-[clamp(1.8rem,5vw,3rem)]">This section failed to load</h1>
      <p className="mt-4 max-w-lg text-[0.98rem] leading-relaxed text-[var(--text-secondary)]">
        Not your fault. Try again — and if it keeps happening, the resume download and contact
        details at the bottom of the page still work.
      </p>
      <div className="mt-8">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 py-3 text-[0.9rem] font-medium text-[var(--accent-contrast)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
