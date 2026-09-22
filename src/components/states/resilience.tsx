'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Three quiet safety nets, mounted once in the layout.
 *
 * 1. **Route progress.** A thin bar under the header while an internal link
 *    loads a new page, so a slow network never looks like a dead click. It
 *    starts on the click and finishes when the new path is showing. It never
 *    shows for same-page anchors, downloads, new tabs or other sites.
 * 2. **Offline notice.** When the browser reports the connection is gone, a
 *    small banner says so, and says "back online" when it returns. It uses
 *    the browser's own online/offline events, so it never guesses.
 * 3. **Broken images.** If an image fails to load, it is hidden and its frame
 *    shows a calm "image unavailable" pattern instead of a broken-image icon.
 *    One capturing listener catches every `<img>` on the page.
 */
export function Resilience() {
  return (
    <>
      <RouteProgress />
      <NetworkNotice />
      <ImageFallback />
    </>
  );
}

function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const from = useRef(pathname);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      from.current = window.location.pathname;
      setState('loading');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (state === 'loading' && pathname !== from.current) {
      setState('done');
      const timer = setTimeout(() => setState('idle'), 450);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pathname, state]);

  return <div className="route-progress" data-state={state} aria-hidden="true" />;
}

function NetworkNotice() {
  const [state, setState] = useState<'online' | 'offline' | 'back'>('online');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const offline = () => {
      if (timer) clearTimeout(timer);
      setState('offline');
    };
    const online = () => {
      setState('back');
      timer = setTimeout(() => setState('online'), 3000);
    };
    if (!navigator.onLine) offline();
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (state === 'online') return null;
  return (
    <div className="net-notice" data-state={state} role="status" aria-live="polite" data-testid="network-notice">
      <span className="net-dot" aria-hidden="true" />
      {state === 'offline'
        ? 'You are offline. The bots are waiting for the connection — what is already on screen still works.'
        : 'Back online. The bots are back at work.'}
    </div>
  );
}

function ImageFallback() {
  useEffect(() => {
    const onError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      target.dataset.failed = 'true';
      target.parentElement?.setAttribute('data-img-failed', 'true');
    };
    document.addEventListener('error', onError, true);
    // Images that failed before this listener existed.
    document.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
        img.dataset.failed = 'true';
        img.parentElement?.setAttribute('data-img-failed', 'true');
      }
    });
    return () => document.removeEventListener('error', onError, true);
  }, []);
  return null;
}
