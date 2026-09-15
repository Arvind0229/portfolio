# ADR-003: The browser processes uploaded images; the server validates them without decoding

**Status:** Accepted · 2026-09-14

---

## Context

The profile photo needed to become admin-managed: upload a new portrait, see it
before saving, go back if it was wrong. `next/image` needs the image's `width`
and `height` or the page reflows when the photo lands, and the design wants a
blur placeholder while it loads.

Both of those normally come from decoding the image server-side, which is what
`sharp` is for. `sharp` is not installed in this project — the directory exists
but `require()` fails — so it would be a new dependency, and this project has
added exactly zero production dependencies beyond `next`, `react`, `react-dom`
and five font packages.

The requirement as stated was "safe image processing/optimization".

## Decision

**The browser resizes and re-encodes. The server validates and never decodes.**

| Step | Where | What |
|---|---|---|
| Resize to 1200px long edge, encode JPEG q0.86 | Browser, `<canvas>` | The canvas that already exists to show a preview |
| Blur placeholder | Browser, 16px canvas | `data:` URI, a few hundred bytes |
| Size cap (4 MB) | Server | Before content is looked at |
| Magic bytes (`FF D8 FF`) | Server | Before structure is walked |
| Pixel dimensions | Server, header parse | `image-dimensions.ts` |
| Dimension bounds (200–5000px) | Server | Denial-of-service bound as much as a quality one |

### Why not decoding is safer than decoding carefully

The safest way to handle a hostile JPEG is not to handle it. Image decoders are
one of the classic memory-corruption surfaces — they are large C libraries
parsing attacker-controlled binary formats, and their CVE histories say so. A
header parse reads a few dozen bytes of length-prefixed structure and does
arithmetic on them: no pixel buffer, no allocation proportional to a declared
size, nothing to overflow. Roughly eighty lines, bounded at every step, against
a native dependency with its own attack surface and its own build story on
Vercel.

So this is not a cheaper substitute for server-side processing that happens to
avoid a dependency. It is the stronger option, and the dependency saved is a
side effect.

### Why the browser doing the work costs nothing

It has already decoded the file to show the preview. The canvas is the same
work. What crosses the wire is a finished 1200px JPEG rather than four megabytes
from a phone camera, so the upload is faster too.

The preview shown on screen is an object URL for the **resized blob**, not the
original file. What the person approves is exactly what is stored — rather than
approving a preview of the original and having a transformation applied
silently afterwards.

### Where the trust boundary actually is

The client is a convenience. Every rule is enforced server-side, and one value
is treated as adversarial input rather than trusted:

- **Dimensions are never taken from the client.** They become the `width` and
  `height` of a public `<img>`; a client that lies reflows the page for every
  visitor. The server reads them from the file's own header.
- **The blur placeholder does come from the client**, because deriving it would
  require the decode this design avoids. It is bounded rather than trusted:
  fixed `data:image/jpeg;base64,` prefix, base64 charset only, 8 KB cap. The
  CSP already allows `data:` images, so nothing new is opened up, and the worst
  a bad one can do is look wrong for a few hundred milliseconds.
- **`facePosition`** is restricted to two percentages, because it is
  interpolated into an inline `style`.

## Consequences

**Good.** No native dependency. No server-side image decode at all. Uploads are
smaller and faster. The preview is honest.

**Cost.** A browser with JavaScript disabled cannot upload a photo. Acceptable:
the entire admin panel is a React application and does not work without it
either.

**Cost.** The stored image is whatever the browser's canvas encoder produced,
which is not as good as a tuned encoder would manage — likely 10–20% larger for
the same visual quality. Not measured, and not worth measuring until the
portrait is actually a performance problem. The previous portrait was 167 KB;
the resize step alone will usually beat that.

**Not claimed.** No Lighthouse measurement has been taken of the difference.

## When to revisit

If a future feature needs server-side image work the browser genuinely cannot
do — generating several responsive sizes at build time, reading EXIF orientation
that the canvas has not already applied, or accepting formats a canvas cannot
encode — then `sharp` becomes a real requirement rather than a default, and the
decision should be reopened with that specific need named. "It would be more
conventional" is not that need.
