import type { NextConfig } from 'next';

/**
 * Content-Security-Policy.
 *
 * `unsafe-inline` is required for styles because Next.js injects critical CSS
 * inline, and for the tiny synchronous theme bootstrap script in <head> (which
 * carries a nonce-free inline body by design to avoid a flash of wrong theme).
 * Everything else is locked down: no remote scripts, no framing, no object
 * embeds, and connections limited to same-origin (the AI endpoint is our own).
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * The dev server serves `/_next/*` to whatever host the page was opened on.
   * Opening the site as `127.0.0.1` when the server announced `localhost` (or
   * the reverse) counts as cross-origin, and Next warns that a future major
   * version will refuse it outright rather than warn.
   *
   * Listing both spellings costs nothing and is development-only — it has no
   * effect on a production build.
   */
  /*
   * Private network ranges are listed so the dev server can be opened from a
   * phone on the same Wi-Fi — the only way to check a touch-scroll fault on the
   * device that actually has it. An emulated viewport has the right shape and
   * the wrong scrolling.
   *
   * Worth knowing when you use it: Next prints a `Network:` address chosen from
   * whatever adapter it finds first, and on a machine with a VPN that is
   * usually the VPN. Here it advertised 172.16.0.2 — the CloudflareWARP
   * adapter, mask 255.255.255.255, reachable by nothing. The real Wi-Fi address
   * was 192.168.1.105. `ipconfig` under "Wireless LAN adapter Wi-Fi" is the one
   * to trust.
   *
   * Dev only. `allowedDevOrigins` has no effect on a production build, so this
   * widens nothing that is deployed.
   */
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.*.*',
    '10.*.*.*',
    '172.16.*.*',
    '172.17.*.*',
    '172.18.*.*',
  ],
  poweredByHeader: false,
  // `standalone` keeps the Docker image small and makes the app portable
  // beyond Vercel without changing a line of application code.
  output: 'standalone',
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  /**
   * Every URL this site has ever had, still resolving.
   *
   * Two rounds of restructuring retired ten paths: four when four pages were
   * merged into two, and six more when the section pages became anchors on a
   * single scrolling home page. Any of them may be in a sitemap Google has
   * crawled, in a message Arvind has sent a recruiter, or in someone's
   * bookmarks — and a portfolio that 404s a link its owner shared is worse
   * than any navigation problem it was fixing.
   *
   * `permanent: true` issues a 308, which tells a crawler to move its index to
   * the new address rather than treating this as a temporary detour. Every
   * destination carries the fragment for the section the old URL was about, so
   * a shared link still lands on the right content rather than at the top of a
   * long page.
   *
   * `/projects` redirects while `/projects/:id` does not: a redirect `source`
   * matches the whole path, so the case studies are untouched.
   */
  async redirects() {
    const moved: ReadonlyArray<readonly [string, string]> = [
      // Round 9 — four pages merged into two.
      ['/expertise', '/#skills'],
      ['/stack', '/#skills'],
      ['/education', '/#about'],
      ['/resume', '/#resume'],
      // Round 10 — section pages became anchors on the home page.
      ['/about', '/#about'],
      ['/experience', '/#experience'],
      ['/projects', '/#projects'],
      ['/skills', '/#skills'],
      ['/impact', '/#impact'],
      ['/contact', '/#contact'],
    ];

    return moved.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
