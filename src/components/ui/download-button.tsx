'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StatusOrb } from '@/components/ui/status-orb';
import { buttonClass } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

/**
 * A download button that shows the real download.
 *
 * Following Arvind's reference, it has four states:
 *
 * - **idle**: the arrow drops into the tray on hover.
 * - **downloading**: a ring fills with the real percentage, read from the
 *   response stream against its Content-Length.
 * - **downloaded**: the ring closes and a check mark draws itself.
 * - **failed**: says so, offers a retry and a direct link to the file.
 *
 * It is still an ordinary `<a href download>`. Without JavaScript, or if the
 * browser cannot read a response as a stream, the browser downloads the file
 * itself. The progress is never simulated. When the size is unknown, the ring
 * spins rather than showing an invented number, and it only says "Downloaded"
 * once the whole file has actually arrived.
 *
 * The error message is written for the visitor. It never shows a status code
 * or a server message: "the file could not be reached" covers a missing file,
 * a server error and a dropped connection alike, and the detail goes to the
 * console for whoever maintains the site.
 */
type State = 'idle' | 'downloading' | 'done' | 'failed';

export function DownloadButton({
  href,
  children,
  filename,
  variant = 'primary',
  size = 'lg',
  className,
  'aria-label': ariaLabel,
}: {
  href: string;
  children: ReactNode;
  filename?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}) {
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (reset.current) clearTimeout(reset.current);
      abort.current?.abort();
    },
    [],
  );

  const name = filename ?? decodeURIComponent(href.split('/').pop()?.split('?')[0] ?? 'download');

  function start(event: React.MouseEvent<HTMLAnchorElement>) {
    // Modified clicks (new tab, save-as) are the browser's business.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    void run();
  }

  async function run() {
    if (state === 'downloading') return;
    if (reset.current) clearTimeout(reset.current);

    setState('downloading');
    setProgress(undefined);
    const controller = new AbortController();
    abort.current = controller;

    try {
      const response = await fetch(href, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const total = Number(response.headers.get('content-length')) || 0;
      let blob: Blob;
      if (response.body && total > 0) {
        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          setProgress(Math.min(99, Math.round((received / total) * 100)));
        }
        blob = new Blob(chunks, { type: response.headers.get('content-type') ?? undefined });
      } else {
        blob = await response.blob();
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      setProgress(100);
      setState('done');
      reset.current = setTimeout(() => setState('idle'), 2600);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Download failed:', error);
      setState('failed');
    }
  }

  const label =
    state === 'downloading'
      ? `Downloading${typeof progress === 'number' ? ` ${progress}%` : '…'}`
      : state === 'done'
        ? 'Downloaded!'
        : state === 'failed'
          ? 'Download failed'
          : null;

  return (
    <span className="dl-wrap">
      <a
        href={href}
        download={name}
        onClick={start}
        aria-label={ariaLabel}
        aria-busy={state === 'downloading'}
        data-state={state}
        data-variant={variant}
        className={cn(buttonClass(variant, size), 'dl-btn', className)}
      >
        <span className="dl-icon" aria-hidden="true">
          {state === 'idle' ? (
            <span className="download-glyph">
              <span className="download-arrow" />
              <span className="download-tray" />
            </span>
          ) : (
            <StatusOrb
              size={22}
              state={state === 'downloading' ? 'working' : state === 'done' ? 'success' : 'error'}
              progress={progress}
            />
          )}
        </span>
        <span className="dl-label">{label ?? children}</span>
        <span className="dl-fill" style={{ transform: `scaleX(${state === 'downloading' ? (progress ?? 0) / 100 : 0})` }} />
      </a>
      <span role="status" aria-live="polite" className="dl-status">
        {state === 'failed' ? (
          <>
            The file could not be reached. Check your connection, then{' '}
            <button type="button" className="dl-retry" onClick={() => void run()}>
              try again
            </button>{' '}
            or{' '}
            <a href={href} target="_blank" rel="noopener noreferrer" className="dl-retry">
              open it directly
            </a>
            .
          </>
        ) : state === 'done' ? (
          <span className="sr-only">Download complete.</span>
        ) : null}
      </span>
    </span>
  );
}
