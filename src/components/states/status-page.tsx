'use client';

import { ErrorScene, type SceneKind } from '@/components/states/error-scene';

/** A status page with a retry that reloads, where reloading can help. */
export function StatusPage({ kind }: { kind: SceneKind }) {
  const retry = kind === '500' || kind === '503' || kind === 'offline' ? () => window.location.reload() : undefined;
  return <ErrorScene kind={kind} onRetry={retry} />;
}
