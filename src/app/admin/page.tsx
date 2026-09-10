import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/admin-panel';
import { isLocalAdmin } from '@/lib/admin/guard';
import { projects } from '@/data/projects';

export const dynamic = 'force-dynamic';

/**
 * The admin route.
 *
 * `noindex, nofollow` is a courtesy to search engines, not a security measure —
 * a robots directive is a request, and anyone can ignore it. The actual
 * protection is that every route under `/api/admin` verifies the session for
 * itself, so the page being found is uninteresting: without a valid code it
 * renders a sign-in box and nothing else, and the data never leaves the server.
 */
export const metadata: Metadata = {
  title: 'Update profile',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  const local = isLocalAdmin();

  return (
    <div className="mx-auto w-full max-w-[76rem] px-5 pb-24 pt-28 sm:px-8 md:pt-32">
      <header className="mb-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Private
        </p>
        <h1 className="mt-2 font-display text-[1.7rem] text-[var(--text-primary)]">
          Update your profile
        </h1>
        <p className="mt-2 max-w-2xl text-[0.88rem] leading-relaxed text-[var(--text-secondary)]">
          {local
            ? 'You are running this on your own machine, so there is nothing to sign in to — this page is not reachable from the internet. Changes are written straight into your project files; push them when you are happy.'
            : 'Changes are committed to your repository and go live when the deployment finishes.'}
        </p>
      </header>

      <AdminPanel
        localMode={local}
        // Only what the form needs to render tabs. The depth itself is fetched
        // by the client from the API rather than passed down, because on the
        // live site the freshest copy is in the repository and not in whatever
        // was bundled at build time.
        projects={projects.map((project) => ({
          id: project.id,
          title: project.title,
          category: project.category,
        }))}
      />
    </div>
  );
}
