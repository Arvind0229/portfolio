import { PipelineLoader } from '@/components/states/pipeline-loader';

/**
 * Shown by Next.js while a route's server work is in flight (a case study, the
 * architecture page). It is a skeleton of a page, with the site's own loader
 * on top.
 */
export default function Loading() {
  return <PipelineLoader />;
}
