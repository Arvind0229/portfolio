'use client';

import { useEffect } from 'react';
import { ErrorScene } from '@/components/states/error-scene';

/**
 * Route-level error boundary. Catches a render or data error in any page and
 * keeps the header and footer on screen around it.
 *
 * Only the digest is shown, as a reference someone could quote. It is an
 * opaque hash Next.js generates, with no message and no stack. The error
 * itself goes to the console by name, never to the page.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] render error', { digest: error.digest, name: error.name });
  }, [error]);

  return <ErrorScene kind="500" onRetry={reset} detail={error.digest} />;
}
