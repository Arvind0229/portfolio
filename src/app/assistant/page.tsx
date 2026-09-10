import type { Metadata } from 'next';
import { PageIntro, PageShell } from '@/components/layout/page-intro';
import { Assistant } from '@/components/ai/assistant';

export const metadata: Metadata = {
  title: 'AI Assistant',
  description: 'Ask about the experience, projects and skills — answered only from the resume, with an honest refusal when something is not there.',
};

export default function Page() {
  return (
    <PageShell>
      <PageIntro
        index="08"
        eyebrow="AI Assistant"
        title={<>Ask about the work, get a <span className="text-[var(--accent-primary)]">grounded answer</span></>}
        description="This assistant is wired to the resume and nothing else. It retrieves the relevant part of the profile before it answers, and says plainly when something is not in there."
      />
      <Assistant />
    </PageShell>
  );
}
