import type { Metadata, Viewport } from 'next';

/**
 * Fonts are self-hosted from the Fontsource packages rather than fetched from
 * Google Fonts at runtime. Three reasons, all of them production concerns:
 *   - no third-party request on the critical path, and no font-host in the CSP;
 *   - builds are hermetic, so CI and an offline machine produce the same output;
 *   - the browser downloads only the unicode-range subsets it actually needs.
 * All four families are OFL-licensed and free to deploy commercially.
 */
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/sora';
import '@fontsource-variable/fraunces';
import './globals.css';

import { AppearanceProvider } from '@/hooks/use-appearance';
import { Backdrop } from '@/components/visuals/backdrop';
import { MagneticField } from '@/components/visuals/magnetic-field';
import { ClickEffects } from '@/components/visuals/click-effects';
import { RobotBuddies } from '@/components/visuals/robot-buddies';
import { Resilience } from '@/components/states/resilience';
import { SmoothScroll } from '@/components/visuals/smooth-scroll';
import { MotionNotice } from '@/components/layout/motion-notice';
import { Navbar } from '@/components/layout/navbar';
import { PageTransition } from '@/components/layout/page-transition';
import { Footer } from '@/components/layout/footer';
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme/constants';
import { siteConfig } from '@/data/site';
import { profile } from '@/data/profile';
import { skillGroups } from '@/data/skills';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  authors: [{ name: profile.name }],
  creator: profile.name,
  keywords: [
    'RPA Developer',
    'TruBot',
    'Datamatics',
    'Automation Edge',
    'Robotic Process Automation',
    'Banking Automation',
    'NBFC',
    'Retail Lending',
    'LOS',
    'LMS',
    'SQL',
    'PL/SQL',
    'Python',
    'Power BI',
    'Mumbai',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.shortName,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#050a12' },
  ],
};

/** schema.org Person, built from the same data layer as the page. */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.title,
    email: `mailto:${profile.email}`,
    telephone: profile.phone,
    description: profile.summary,
    address: { '@type': 'PostalAddress', addressLocality: 'Mumbai', addressCountry: 'IN' },
    worksFor: { '@type': 'Organization', name: 'SBFC Finance Limited' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Ghanshyam Das Saraf College, Mumbai' },
    knowsAbout: skillGroups.flatMap((group) => group.skills).slice(0, 30),
    url: siteConfig.url,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="no-js"
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored theme before first paint — no flash, no shift. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
      </head>
      <body>
        <AppearanceProvider>
          <Backdrop />
          <MagneticField />
          <ClickEffects />
          <RobotBuddies />
          <Resilience />
          <SmoothScroll />
          <Navbar />
          {/* Pinned to the bottom edge, and rendering nothing at all unless
              the OS is actually asking for reduced motion — see the note in
              the component for why it is not in the flow up here. */}
          <MotionNotice />
          <main id="main">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </AppearanceProvider>
      </body>
    </html>
  );
}
