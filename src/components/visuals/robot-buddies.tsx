'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { siteSettings } from '@/data/site-settings';

/**
 * Robot buddies — three small robots that play across every page.
 *
 * Arvind asked for a robot that plays hide and seek: it peeks from a corner
 * now and then. He also asked for one or two smaller robots near the bottom
 * that chase each other. Clicking a robot makes it say hello. Double-clicking
 * spins its head under a ring of stars, and then it smiles or cries. He wanted
 * all of this on phones as well.
 *
 * ## The cast
 *
 * - **The peeker.** Stays hidden most of the time. Every 12–22 seconds it
 *   leans in from a corner or a side edge (it never uses the same spot twice
 *   in a row), looks around, and ducks back. If someone is playing with it,
 *   it stays out longer.
 * - **The chasers.** Two smaller robots that come out along the bottom edge
 *   in short sessions: one runs, the other follows. Sometimes the first one
 *   ducks out of sight, the second stops and looks around, and the first pops
 *   up somewhere else ("Boo!") and makes the second jump. Then they run off,
 *   and the next session starts 25–45 seconds later. Because they only show up
 *   in sessions, the bottom of the page is usually clear to read.
 *
 * ## How it is built, and what it costs
 *
 * JavaScript only picks where to go and when, and writes a few attributes and
 * custom properties on three elements. All movement is CSS transitions and
 * keyframes on `transform`, so it runs on the compositor. No dependency, no
 * canvas, no animation loop. When nothing is on screen, nothing runs except
 * a timer.
 *
 * The robot is an original drawing in the same family as the hero robot
 * (white shell, dark visor, cyan eyes). The head is its own group so it can
 * spin, and each face (eyes plus mouth) is a separate group that CSS switches
 * with `data-face`.
 *
 * ## When there are no robots
 *
 * - When the admin setting `robots` is false (Site defaults tab).
 * - Under reduced motion, which is the same two-part check the rest of the
 *   site uses. A robot that only moves is not worth keeping still on screen.
 * - When printing (`no-print`).
 * - During server rendering. They appear after mount, so the HTML never
 *   depends on the random choices.
 *
 * They are `aria-hidden`, and they are not buttons. Controls that appear and
 * disappear are a trap for keyboard users, and they carry no content. Mouse
 * clicks and touch taps both work.
 */

type Face = 'normal' | 'hello' | 'happy' | 'sad' | 'dizzy' | 'boo';
type Spot = 'bl' | 'br' | 'left' | 'right';

const HELLOS = ['Hello!', 'Hi there!', 'Namaste!', 'Hey!'] as const;
const SPOTS: readonly Spot[] = ['bl', 'br', 'left', 'right'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pickOne<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

/** The drawing. Faces are switched by CSS on the wrapper's `data-face`. */
export function BuddyBot() {
  return (
    <svg viewBox="0 0 100 124" className="bb-svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bb-shell" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>

      {/* Legs and arms first, so the body overlaps them. */}
      <rect className="bb-leg bb-leg-l" x="36" y="96" width="10" height="20" rx="4.5" fill="#64748b" />
      <rect className="bb-leg bb-leg-r" x="54" y="96" width="10" height="20" rx="4.5" fill="#64748b" />
      <rect className="bb-arm bb-arm-l" x="15" y="64" width="10" height="26" rx="5" fill="url(#bb-shell)" stroke="#94a3b8" />
      <rect className="bb-arm bb-arm-r" x="75" y="64" width="10" height="26" rx="5" fill="url(#bb-shell)" stroke="#94a3b8" />

      <rect x="26" y="60" width="48" height="40" rx="14" fill="url(#bb-shell)" stroke="#94a3b8" />
      <circle className="bb-core" cx="50" cy="79" r="6" />
      <rect x="44" y="54" width="12" height="8" rx="2" fill="#94a3b8" />

      <g className="bb-head">
        <line x1="50" y1="18" x2="50" y2="8" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <circle className="bb-bulb" cx="50" cy="6.5" r="4.5" />
        <rect x="11" y="30" width="9" height="15" rx="3" fill="#94a3b8" />
        <rect x="80" y="30" width="9" height="15" rx="3" fill="#94a3b8" />
        <rect x="17" y="16" width="66" height="42" rx="17" fill="url(#bb-shell)" stroke="#94a3b8" />
        <rect x="25" y="24" width="50" height="27" rx="12" fill="#0f1b2d" />

        <g className="bb-eyes bb-eyes-normal" fill="#67e8f9">
          <ellipse cx="40" cy="35" rx="4.2" ry="5.2" />
          <ellipse cx="60" cy="35" rx="4.2" ry="5.2" />
        </g>
        <g className="bb-eyes bb-eyes-happy" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round">
          <path d="M35 37 q5 -7 10 0" />
          <path d="M55 37 q5 -7 10 0" />
        </g>
        <g className="bb-eyes bb-eyes-sad" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round">
          <path d="M35 33 q5 5 10 0" />
          <path d="M55 33 q5 5 10 0" />
        </g>
        <g className="bb-eyes bb-eyes-dizzy" fill="none" stroke="#67e8f9" strokeWidth="2.6" strokeLinecap="round">
          <path d="M36 31 l8 8 M44 31 l-8 8" />
          <path d="M56 31 l8 8 M64 31 l-8 8" />
        </g>

        <path className="bb-mouth bb-mouth-normal" d="M45 45.5 h10" />
        <path className="bb-mouth bb-mouth-smile" d="M42.5 43 q7.5 6.5 15 0" />
        <path className="bb-mouth bb-mouth-sad" d="M43 47.5 q7 -5.5 14 0" />
        <ellipse className="bb-mouth-o" cx="50" cy="45.5" rx="3" ry="2.8" />

        <g className="bb-tears" fill="#7dd3fc">
          <path className="bb-tear" d="M38 41 q2 3.5 0 5 q-2 -1.5 0 -5 Z" />
          <path className="bb-tear bb-tear-r" d="M62 41 q2 3.5 0 5 q-2 -1.5 0 -5 Z" />
        </g>
      </g>

      {/* The dizzy ring: stars orbiting above the head, flattened into an
          ellipse so the ring reads as lying round the head. */}
      <g className="bb-stars" transform="translate(50 6) scale(1 0.38)">
        <g className="bb-stars-spin">
          {[
            [24, 0],
            [-24, 0],
            [0, 24],
            [0, -24],
          ].map(([x, y]) => (
            <polygon
              key={`${x}-${y}`}
              transform={`translate(${x} ${y}) scale(1.4 3.2)`}
              points="0,-4 1.2,-1.3 3.8,-1.2 1.9,0.6 2.4,3.2 0,1.8 -2.4,3.2 -1.9,0.6 -3.8,-1.2 -1.2,-1.3"
              fill="#fbbf24"
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      setAllowed(!query.matches || document.documentElement.dataset.motion === 'full');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return allowed;
}

export function RobotBuddies() {
  const allowed = useMotionAllowed();
  if (!siteSettings.robots || !allowed) return null;
  return <BuddiesStage />;
}

function BuddiesStage() {
  const peeker = useRef<HTMLDivElement | null>(null);
  const chaserA = useRef<HTMLDivElement | null>(null);
  const chaserB = useRef<HTMLDivElement | null>(null);
  /* Face/speech timers per robot, so a new interaction cancels the old one
     rather than an earlier "back to normal" cutting a new face short. */
  const faceTimers = useRef(new WeakMap<HTMLElement, ReturnType<typeof setTimeout>[]>());
  const lastTap = useRef(new WeakMap<HTMLElement, number>());
  const pendingTap = useRef(new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>());
  const lingerUntil = useRef(0);

  const say = useCallback((el: HTMLElement, text: string) => {
    const bubble = el.querySelector<HTMLElement>('.bb-say');
    if (!bubble) return;
    bubble.textContent = text;
    el.removeAttribute('data-saying');
    void el.offsetWidth;
    el.setAttribute('data-saying', '');
  }, []);

  const setFace = useCallback((el: HTMLElement, steps: [Face, number, string?][]) => {
    for (const timer of faceTimers.current.get(el) ?? []) clearTimeout(timer);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    for (const [face, hold, text] of steps) {
      timers.push(
        setTimeout(() => {
          el.dataset.face = face;
          if (text) say(el, text);
        }, at),
      );
      at += hold;
    }
    timers.push(
      setTimeout(() => {
        el.dataset.face = 'normal';
        el.removeAttribute('data-saying');
      }, at),
    );
    faceTimers.current.set(el, timers);
  }, [say]);

  const onTap = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const el = event.currentTarget.closest<HTMLElement>('.bb');
      if (!el) return;
      lingerUntil.current = Date.now() + 6000;
      const now = Date.now();
      const last = lastTap.current.get(el) ?? 0;
      lastTap.current.set(el, now);
      const pending = pendingTap.current.get(el);
      if (now - last < 320) {
        // Double: head spins under the stars, then a mood.
        if (pending) clearTimeout(pending);
        pendingTap.current.delete(el);
        const mood: [Face, number, string] =
          Math.random() < 0.55 ? ['happy', 2200, 'Hehe!'] : ['sad', 2400, 'Waaah!'];
        setFace(el, [['dizzy', 1900, 'Whoa…'], mood]);
        return;
      }
      pendingTap.current.set(
        el,
        setTimeout(() => {
          pendingTap.current.delete(el);
          setFace(el, [['hello', 1800, pickOne(HELLOS)]]);
        }, 300),
      );
    },
    [setFace],
  );

  /* ---------------- The peeker ---------------- */
  useEffect(() => {
    const el = peeker.current;
    if (!el) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    let last: Spot | null = null;

    const hide = () => {
      if (Date.now() < lingerUntil.current) {
        after(lingerUntil.current - Date.now() + 200, hide);
        return;
      }
      el.dataset.shown = 'false';
      after(rand(12000, 22000), peek);
    };
    const peek = () => {
      const spot = pickOne(SPOTS.filter((s) => s !== last));
      last = spot;
      // Jump to the new spot's hidden position with no transition, so it
      // never visibly slides across the screen between spots; then lean in.
      el.dataset.jump = 'true';
      el.dataset.spot = spot;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.dataset.jump = 'false';
          el.dataset.shown = 'true';
        }),
      );
      after(rand(4200, 6200), hide);
    };

    el.dataset.shown = 'false';
    el.dataset.spot = 'br';
    after(rand(5000, 9000), peek);
    return () => timers.forEach(clearTimeout);
  }, []);

  /* ---------------- The chasers ---------------- */
  useEffect(() => {
    const a = chaserA.current;
    const b = chaserB.current;
    if (!a || !b) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const pos = new Map<HTMLElement, number>([
      [a, -120],
      [b, -200],
    ]);
    const width = () => window.innerWidth;
    const size = () => a.getBoundingClientRect().width || 50;

    const place = (bot: HTMLElement, x: number) => {
      bot.style.setProperty('--dur', '0ms');
      bot.style.setProperty('--x', `${x}px`);
      pos.set(bot, x);
    };
    /** Run to x at `speed` px/s; returns the time it takes. */
    const runTo = (bot: HTMLElement, x: number, speed: number) => {
      const from = pos.get(bot) ?? 0;
      const ms = Math.max(250, (Math.abs(x - from) / speed) * 1000);
      bot.dataset.dir = x < from ? 'left' : 'right';
      bot.dataset.walk = 'true';
      bot.style.setProperty('--dur', `${ms}ms`);
      bot.style.setProperty('--x', `${x}px`);
      pos.set(bot, x);
      after(ms, () => {
        if (pos.get(bot) === x) bot.dataset.walk = 'false';
      });
      return ms;
    };

    let moves = 0;
    const step = () => {
      const w = width();
      const s = size();
      if (moves <= 0) {
        // Exit: both run off the nearer edge, then the next session later.
        const exit = (pos.get(a) ?? 0) > w / 2 ? w + 2 * s : -3 * s;
        const t = runTo(a, exit, 260);
        after(350, () => runTo(b, exit, 280));
        after(t + 1200, () => {
          a.dataset.present = 'false';
          b.dataset.present = 'false';
          after(rand(25000, 45000), start);
        });
        return;
      }
      moves -= 1;
      if (Math.random() < 0.3) {
        // Hide and seek: A ducks, B searches, A pops up elsewhere.
        a.dataset.duck = 'true';
        const bx = Math.min(w - s * 1.5, Math.max(s * 0.5, pos.get(a) ?? w / 2));
        const tb = runTo(b, bx, 220);
        after(tb + 100, () => {
          b.dataset.look = 'true';
        });
        after(tb + 2000, () => {
          b.dataset.look = 'false';
          place(a, rand(0.08, 0.9) * (w - s));
          a.dataset.duck = 'false';
          setFace(a, [['boo', 1200, 'Boo!']]);
          after(250, () => {
            b.dataset.hop = 'true';
            setFace(b, [['dizzy', 700], ['happy', 900]]);
          });
          after(950, () => {
            b.dataset.hop = 'false';
          });
          after(1400, step);
        });
        return;
      }
      const target = rand(0.05, 0.92) * (w - s);
      const ta = runTo(a, target, 200);
      const behind = target + ((pos.get(b) ?? 0) < target ? -1.3 : 1.3) * s;
      after(420, () => runTo(b, behind, 215));
      after(ta + rand(400, 1100), step);
    };

    const start = () => {
      const w = width();
      const fromLeft = Math.random() < 0.5;
      const s = size();
      place(a, fromLeft ? -2 * s : w + s);
      place(b, fromLeft ? -3.4 * s : w + 2.4 * s);
      a.dataset.present = 'true';
      b.dataset.present = 'true';
      a.dataset.duck = 'false';
      moves = Math.round(rand(4, 7));
      after(60, step);
    };

    after(rand(8000, 14000), start);
    return () => timers.forEach(clearTimeout);
  }, [setFace]);

  const robot = (ref: React.RefObject<HTMLDivElement | null>, role: string) => (
    <div ref={ref} className={`bb bb-${role}`} data-face="normal" data-testid={`robot-${role}`}>
      <div className="bb-hop">
        <div className="bb-tilt" onPointerUp={onTap}>
          <BuddyBot />
        </div>
        <span className="bb-say" />
      </div>
    </div>
  );

  return (
    <div className="bb-stage no-print" aria-hidden="true">
      {robot(peeker, 'peeker')}
      {robot(chaserA, 'chaser-a')}
      {robot(chaserB, 'chaser-b')}
    </div>
  );
}
