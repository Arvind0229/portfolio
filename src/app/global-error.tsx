'use client';

import './globals.css';
import { useEffect } from 'react';
import { ErrorScene } from '@/components/states/error-scene';

/**
 * The last line of defence: an error in the root layout itself, where even
 * the header could not render. It has to supply its own `<html>` and `<body>`.
 * Same scene as every other error page, same rules: a reference digest at
 * most, never a message or a stack.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] root error', { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorScene kind="500" onRetry={reset} detail={error.digest} />
      </body>
    </html>
  );
}
