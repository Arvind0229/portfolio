import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SCENES, type SceneKind } from '@/components/states/error-scene';
import { StatusPage } from '@/components/states/status-page';

/**
 * Status pages that are not built into Next.js: 401, 403, 500, 503, offline
 * and maintenance. Middleware rewrites to `maintenance` when the admin switch
 * is on, and it answers with a 503 so crawlers know it is temporary. The
 * others are here so every state has one real, linkable page, and so each one
 * can be checked in a browser.
 */
const KINDS = ['401', '403', '500', '503', 'offline', 'maintenance'] as const;

export function generateStaticParams() {
  return KINDS.map((code) => ({ code }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const scene = SCENES[code as SceneKind];
  return {
    title: scene ? scene.label : 'Status',
    robots: { index: false, follow: false },
  };
}

export default async function Status({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(KINDS as readonly string[]).includes(code)) notFound();
  return <StatusPage kind={code as SceneKind} />;
}
