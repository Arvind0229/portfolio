'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { BuddyBot } from '@/components/visuals/robot-buddies';

/**
 * Every full-page status on the site: 404, 401, 403, 500, 503, offline and
 * maintenance.
 *
 * ## The look, and why it ignores the theme
 *
 * Arvind asked for the error pages in one futuristic style of their own: dark
 * brown to black, copper glow, glass, floating 3D shapes and a few particles.
 * Everything else on the site follows the theme; these pages deliberately do
 * not. A visitor who lands here has left the normal flow, and a page that
 * looks different says so at a glance. The type is the site's own.
 *
 * ## The rules it keeps
 *
 * - It says what happened in plain words, then what to do next. It never
 *   shows a stack trace, a server message or a status text from an API.
 * - The jokes are about the page and the bots, never about the visitor or
 *   about Arvind's work.
 * - Retry is offered only where retrying can help (500, 503, offline).
 * - The code is a real `<h1>` sentence for screen readers ("Error 404: page
 *   not found"), and the big digits are decoration.
 * - All motion is CSS (ERROR SCENE in globals.css). It stops under reduced
 *   motion, and the page works the same without it.
 */
export type SceneKind =
  | '404'
  | '401'
  | '403'
  | '500'
  | '503'
  | 'offline'
  | 'maintenance';

interface SceneCopy {
  code: string;
  label: string;
  title: string;
  lines: readonly string[];
  face: 'sad' | 'dizzy' | 'boo' | 'happy' | 'normal';
}

export const SCENES: Record<SceneKind, SceneCopy> = {
  '404': {
    code: '404',
    label: 'Page not found',
    title: 'This page went for a coffee',
    lines: [
      'It said five minutes. That was a while ago.',
      'Our bot automated this page out of existence. Very efficient. Slightly awkward.',
      'Busy automating something else. The homepage is still here, though.',
      'The page you want is in a queue. The queue is empty. We checked twice.',
      'Error handled gracefully. The page, less so.',
    ],
    face: 'sad',
  },
  '401': {
    code: '401',
    label: 'Sign-in needed',
    title: 'Who goes there?',
    lines: ['This part needs a sign-in. The bots are polite, but firm.'],
    face: 'boo',
  },
  '403': {
    code: '403',
    label: 'Access denied',
    title: 'You found the door. It is not your door.',
    lines: ['This area is not open to visitors. Everything public is one click away.'],
    face: 'normal',
  },
  '500': {
    code: '500',
    label: 'Something broke on our side',
    title: 'A bot tripped over an exception',
    lines: ['Not your fault. It has been logged. Trying again usually does it.'],
    face: 'dizzy',
  },
  '503': {
    code: '503',
    label: 'Service unavailable',
    title: 'Too many bots, not enough coffee',
    lines: ['The service is busy or briefly down. Give it a minute and try again.'],
    face: 'dizzy',
  },
  offline: {
    code: '···',
    label: 'You are offline',
    title: 'The bots cannot reach the internet',
    lines: ['Check your Wi-Fi or data. This page will try again as soon as you are back.'],
    face: 'sad',
  },
  maintenance: {
    code: '⚙',
    label: 'Down for maintenance',
    title: 'Upgrading the bots',
    lines: ['Back shortly: better, faster, still polite. Thanks for waiting.'],
    face: 'happy',
  },
};

function Quips({ lines }: { lines: readonly string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (lines.length < 2) return;
    const timer = setInterval(() => setIndex((n) => (n + 1) % lines.length), 3800);
    return () => clearInterval(timer);
  }, [lines.length]);
  return (
    <p className="err-quip" aria-live="off">
      <span key={index} className="err-quip-line">
        {lines[index]}
      </span>
    </p>
  );
}

export function ErrorScene({
  kind,
  onRetry,
  detail,
  children,
}: {
  kind: SceneKind;
  /** Shown as "Try again" where retrying can help. */
  onRetry?: () => void;
  /** A short, safe reference (e.g. an error digest) — never a message from the server. */
  detail?: string;
  children?: ReactNode;
}) {
  const copy = SCENES[kind];
  const digits = copy.code.length === 3 && /^\d+$/.test(copy.code) ? copy.code.split('') : null;

  return (
    <div className="err-scene" data-kind={kind}>
      <div className="err-ambient" aria-hidden="true">
        {Array.from({ length: 14 }, (_, n) => (
          <span key={n} style={{ ['--n' as string]: n }} />
        ))}
      </div>
      <div className="err-shapes" aria-hidden="true">
        <span className="err-ring" />
        <span className="err-prism" />
        <span className="err-arc" />
      </div>

      <section className="err-card" aria-labelledby="err-title">
        <p className="err-label">
          System status · <span>{copy.label}</span>
        </p>

        <div className="err-code" aria-hidden="true">
          {digits ? (
            <>
              <span className="err-digit">{digits[0]}</span>
              <span className="err-orb">
                <span className="err-bot bb" data-face={copy.face}>
                  <BuddyBot />
                </span>
              </span>
              <span className="err-digit">{digits[2]}</span>
            </>
          ) : (
            <span className="err-orb err-orb-solo">
              <span className="err-bot bb" data-face={copy.face}>
                <BuddyBot />
              </span>
            </span>
          )}
        </div>

        <h1 id="err-title" className="err-title">
          <span className="sr-only">
            {digits ? `Error ${copy.code}: ` : ''}
            {copy.label}.{' '}
          </span>
          {copy.title}
        </h1>
        <Quips lines={copy.lines} />

        <div className="err-actions">
          {onRetry ? (
            <button type="button" className="err-btn err-btn-primary" onClick={onRetry}>
              <span aria-hidden="true" className="err-btn-icon">
                ↻
              </span>
              Try again
            </button>
          ) : null}
          <Link href="/" className={onRetry ? 'err-btn' : 'err-btn err-btn-primary'}>
            <span aria-hidden="true" className="err-btn-icon">
              ⌂
            </span>
            Back to the portfolio
          </Link>
          {children}
        </div>

        {detail ? <p className="err-detail">Reference: {detail}</p> : null}
      </section>
    </div>
  );
}
