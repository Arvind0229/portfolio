'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Field, inputClass } from '@/components/admin/admin-panel';
import { cn } from '@/lib/utils/cn';

/**
 * Replace the portrait the site shows.
 *
 * ## Why the browser does the resizing
 *
 * A phone camera produces a 4000×3000 JPEG of several megabytes. Uploading that
 * and shrinking it on the server means the server decodes an image it did not
 * produce — the one operation this design refuses to do (ADR-003). Doing it
 * here instead costs nothing extra: the browser has already decoded the file to
 * show a preview, so the canvas it draws into is the same work, and what
 * crosses the wire is the finished 1200px JPEG.
 *
 * The server still checks everything: magic bytes, size, and the real pixel
 * dimensions read from the JPEG's own header. This component is a convenience,
 * never the gate.
 *
 * ## Why the preview is the thing being uploaded
 *
 * The `<img>` on screen is an object URL for the *resized* blob, not the file
 * the person chose. So what they approve is exactly what is stored — rather
 * than a preview of the original and a silent transformation afterwards, which
 * is how a portrait ends up cropped differently from what was agreed.
 */

/** Long edge of the stored portrait. */
const TARGET_EDGE = 1200;
const JPEG_QUALITY = 0.86;
/** The blur placeholder is drawn at this width, then stretched over the photo. */
const BLUR_EDGE = 16;

export interface PhotoVersionRow {
  readonly id: string;
  readonly label: string;
  readonly uploadedAt: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly facePosition: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string };

interface Prepared {
  readonly blob: Blob;
  readonly objectUrl: string;
  readonly width: number;
  readonly height: number;
  readonly blurDataURL: string;
  readonly bytes: number;
}

function decode(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      // Deliberately not "upload failed": the file never left the browser. A
      // person who is told the upload failed will retry it; a person who is
      // told the file cannot be opened will pick a different file.
      reject(new Error('That file could not be opened as an image.'));
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded.'))),
      'image/jpeg',
      quality,
    );
  });
}

async function prepare(file: File): Promise<Prepared> {
  const image = await decode(file);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  // Never upscale. Enlarging a small photo produces a bigger file that looks
  // worse, which is the opposite of what this step is for.
  const scale = longest > TARGET_EDGE ? TARGET_EDGE / longest : 1;
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not process the image.');
  context.drawImage(image, 0, 0, width, height);
  const blob = await toBlob(canvas, JPEG_QUALITY);

  // The blur placeholder, from the same decoded image rather than a second
  // read: a few hundred bytes that stand in for the photo while it loads.
  const blurCanvas = document.createElement('canvas');
  const blurHeight = Math.max(1, Math.round((BLUR_EDGE * height) / width));
  blurCanvas.width = BLUR_EDGE;
  blurCanvas.height = blurHeight;
  blurCanvas.getContext('2d')?.drawImage(image, 0, 0, BLUR_EDGE, blurHeight);
  const blurDataURL = blurCanvas.toDataURL('image/jpeg', 0.5);

  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    width,
    height,
    blurDataURL,
    bytes: blob.size,
  };
}

export function PhotoEditor({
  active,
  versions,
  onChanged,
}: {
  active: string | null;
  versions: readonly PhotoVersionRow[];
  onChanged: (next: { active: string; versions: readonly PhotoVersionRow[] }) => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [alt, setAlt] = useState('');
  const [facePosition, setFacePosition] = useState('50% 50%');
  const fileRef = useRef<HTMLInputElement>(null);
  const preparedRef = useRef<Prepared | null>(null);

  // Object URLs are a manual allocation. Without this, choosing five photos in
  // a row leaks five decoded images for the life of the page.
  preparedRef.current = prepared;
  useEffect(
    () => () => {
      if (preparedRef.current) URL.revokeObjectURL(preparedRef.current.objectUrl);
    },
    [],
  );

  const current = versions.find((version) => version.id === active) ?? null;

  const reset = useCallback(() => {
    setPrepared((existing) => {
      if (existing) URL.revokeObjectURL(existing.objectUrl);
      return null;
    });
    setStatus({ kind: 'idle' });
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  async function choose(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: 'reading' });
    try {
      const next = await prepare(file);
      setPrepared((existing) => {
        if (existing) URL.revokeObjectURL(existing.objectUrl);
        return next;
      });
      // Seed the description from the live photo so the common case — a new
      // portrait of the same person — needs no typing, while still making the
      // field visible and editable rather than silently inherited.
      setAlt((value) => value || current?.alt || '');
      setFacePosition(current?.facePosition ?? '50% 50%');
      setStatus({ kind: 'ready' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'That file could not be read.',
      });
    }
  }

  async function save() {
    if (!prepared) return;
    if (!alt.trim()) {
      setStatus({ kind: 'error', message: 'Describe the photo before saving it.' });
      return;
    }
    setStatus({ kind: 'saving' });

    const body = new FormData();
    body.set('photo', prepared.blob, 'portrait.jpg');
    body.set('alt', alt.trim());
    body.set('facePosition', facePosition);
    body.set('blurDataURL', prepared.blurDataURL);
    body.set('label', `Portrait ${new Date().toLocaleDateString()}`);

    try {
      const response = await fetch('/api/admin/photo', { method: 'POST', body });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        active?: string;
        versions?: readonly PhotoVersionRow[];
        pendingDeploy?: boolean;
      };
      if (!response.ok || !result.ok) {
        setStatus({ kind: 'error', message: result.error ?? 'The photo could not be saved.' });
        return;
      }
      if (result.active && result.versions) {
        onChanged({ active: result.active, versions: result.versions });
      }
      reset();
      setStatus({
        kind: 'saved',
        message: result.pendingDeploy
          ? 'Saved and committed. The site will show it after the next deployment.'
          : 'Saved to your project files. Reload the public page to see it.',
      });
    } catch {
      setStatus({ kind: 'error', message: 'Could not reach the server. Nothing was changed.' });
    }
  }

  async function activate(id: string) {
    setStatus({ kind: 'saving' });
    try {
      const response = await fetch('/api/admin/photo', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        active?: string;
        versions?: readonly PhotoVersionRow[];
      };
      if (!response.ok || !result.ok) {
        setStatus({ kind: 'error', message: result.error ?? 'Could not switch the photo.' });
        return;
      }
      if (result.active && result.versions) {
        onChanged({ active: result.active, versions: result.versions });
      }
      setStatus({ kind: 'saved', message: 'Switched. Reload the public page to see it.' });
    } catch {
      setStatus({ kind: 'error', message: 'Could not reach the server. Nothing was changed.' });
    }
  }

  const busy = status.kind === 'saving' || status.kind === 'reading';

  return (
    <section className="surface-card p-5" data-testid="photo-editor">
      <h2 className="font-display text-[1.05rem] text-[var(--text-primary)]">Profile photo</h2>
      <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--text-secondary)]">
        Replaces the portrait on every page. The photo is resized here in your browser
        before it is sent, so a straight-off-the-camera picture is fine. JPEG or PNG.
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        <figure className="shrink-0">
          <figcaption className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            On the site now
          </figcaption>
          {current ? (
            <Image
              src={current.src}
              alt={current.alt}
              width={120}
              height={150}
              data-testid="photo-current"
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] object-cover"
              style={{ objectPosition: current.facePosition, width: 120, height: 150 }}
            />
          ) : (
            <p className="text-[0.8rem] text-[var(--text-muted)]" data-testid="photo-current-none">
              No photo set.
            </p>
          )}
        </figure>

        {prepared ? (
          <figure className="shrink-0">
            <figcaption className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--accent-primary)]">
              New — not saved yet
            </figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={prepared.objectUrl}
              alt="The photo you selected"
              width={120}
              height={150}
              data-testid="photo-preview"
              className="rounded-[var(--radius-md)] border border-[var(--accent-primary)] object-cover"
              style={{ objectPosition: facePosition, width: 120, height: 150 }}
            />
            <p className="mt-1.5 font-mono text-[0.62rem] text-[var(--text-muted)]">
              {prepared.width}×{prepared.height} · {Math.round(prepared.bytes / 1024)} KB
            </p>
          </figure>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          disabled={busy}
          data-testid="photo-file"
          onChange={(event) => void choose(event.target.files?.[0])}
          className="block w-full text-[0.82rem] text-[var(--text-secondary)] file:mr-3 file:rounded-[var(--radius-md)] file:border file:border-[var(--border)] file:bg-[var(--surface)] file:px-3 file:py-2 file:text-[0.82rem] file:text-[var(--text-primary)]"
        />

        {prepared ? (
          <>
            <Field
              label="Description for screen readers"
              hint="What someone who cannot see the photo should be told. Usually just your name."
            >
              <input
                type="text"
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                data-testid="photo-alt"
                className={inputClass}
              />
            </Field>
            <Field
              label="Face position"
              hint="Two percentages — horizontal then vertical. Lower the second number if the top of your head is cut off in a square crop."
            >
              <input
                type="text"
                value={facePosition}
                onChange={(event) => setFacePosition(event.target.value)}
                data-testid="photo-face-position"
                className={inputClass}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                data-testid="photo-save"
                className="rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 py-2.5 text-[0.9rem] font-medium text-white disabled:opacity-50"
              >
                {status.kind === 'saving' ? 'Saving…' : 'Save this photo'}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                data-testid="photo-cancel"
                className="text-[0.82rem] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}

        {status.kind === 'reading' ? (
          <p role="status" data-testid="photo-status" className="text-[0.82rem] text-[var(--text-secondary)]">
            Reading the image…
          </p>
        ) : null}
        {status.kind === 'saved' ? (
          <p role="status" data-testid="photo-status" className="text-[0.82rem] text-[var(--accent-primary)]">
            {status.message}
          </p>
        ) : null}
        {status.kind === 'error' ? (
          <p
            role="alert"
            data-testid="photo-error"
            className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-[0.82rem] text-[var(--text-primary)]"
          >
            {status.message}
          </p>
        ) : null}
      </div>

      {versions.length > 1 ? (
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Earlier photos
          </h3>
          <p className="mt-1.5 text-[0.78rem] text-[var(--text-secondary)]">
            The last three are kept. Switching back is one click — nothing was overwritten.
          </p>
          <ul className="mt-3 flex flex-wrap gap-3" data-testid="photo-versions">
            {versions.map((version) => {
              const live = version.id === active;
              return (
                <li key={version.id} data-testid={`photo-version-${version.id}`}>
                  <button
                    type="button"
                    onClick={() => void activate(version.id)}
                    disabled={busy || live}
                    data-active={live ? 'true' : 'false'}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border p-2 text-[0.7rem] disabled:cursor-default',
                      live
                        ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]',
                    )}
                  >
                    <Image
                      src={version.src}
                      alt=""
                      width={56}
                      height={70}
                      className="rounded-[calc(var(--radius-md)-2px)] object-cover"
                      style={{ objectPosition: version.facePosition, width: 56, height: 70 }}
                    />
                    {live ? 'Live' : 'Use this'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
