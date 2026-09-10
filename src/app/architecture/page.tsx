import type { Metadata } from 'next';
import { PageIntro, PageShell } from '@/components/layout/page-intro';
import { ArchitectureSection } from '@/components/sections/architecture-section';

export const metadata: Metadata = {
  title: 'Architecture',
  description: 'How an automation gets from a requirement conversation to a monitored bot running in production.',
};

export default function Page() {
  return (
    <PageShell>
      <PageIntro
        index="07"
        eyebrow="Architecture"
        title={<>How I design and build <span className="text-[var(--accent-primary)]">automation solutions</span></>}
        description="Two views of the same discipline: the delivery cycle around every bot, and the runtime shape of the bots themselves."
      />
      <ArchitectureSection />
    </PageShell>
  );
}
