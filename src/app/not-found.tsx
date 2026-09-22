import type { Metadata } from 'next';
import { ErrorScene } from '@/components/states/error-scene';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

/**
 * 404. Served with a real 404 status by Next.js, so search engines and link
 * checkers see the truth. The look and the jokes live in `ErrorScene`.
 */
export default function NotFound() {
  return <ErrorScene kind="404" />;
}
