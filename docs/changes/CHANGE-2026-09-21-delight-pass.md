# Change: one skills list, hover, click effects, footer, robot buddies

## Date

2026-09-21 (CHANGE-010)

## Request

Arvind asked for these, after looking at the laptop build:

1. The stack was shown twice. The coloured cards opened no popup, and the plain cards opened a popup but had no theme colour.
2. A hover effect on every card.
3. A click animation on every button, with its own style for:
   - Download
   - WhatsApp
   - Get in touch
   - Mail, sending like a paper plane
4. "Should the footer do something?"
5. Some text animation.
6. Robots:
   - The robot peeks from a corner now and then, like hide and seek.
   - One or two smaller robots near the bottom chase each other.
   - Click a robot and it says hello.
   - Double-click and its head spins under a ring of stars, then it smiles or cries.
   - All of this on phones too.

## Current state (before)

- `ExpertiseSection` drew a coloured, non-interactive copy of all six skill groups. `SkillsSection` then drew the same groups again as plain cards whose chips opened the explainer.
- Only cards that held a link or a button lifted on hover.
- Buttons had a hover state only. The download glyph moved on hover, and the WhatsApp button had a small ring on `:active`.
- The footer was static.
- There was one robot, in the Midnight hero only.

## Reused, not rebuilt

| Reused | Instead of |
|---|---|
| `SkillsSection` together with `SkillExplainerProvider` and `SkillChip` | A third skills grid. The coloured look (`clay-rotate`, the icon tiles) moved onto the interactive list, and the duplicate grid was removed |
| The `.surface-card` recipe | A card component rewrite. Hover is one rule in the `components` layer |
| The one-listener pattern from `MagneticField` | One listener per button. `ClickEffects` is a single document click listener, and CSS draws every effect |
| `LinkButton` | New button components. It works out the effect from the link, and a new optional `fx` prop overrides it |
| The existing download glyph and the `wa-mark` | New icons |
| The Site defaults content pipeline (parser, registry, admin tab) | A new settings store. `robots: boolean` was added end to end |

**Dependencies added: none.**

## Changes

- **Skills:** listed once. The six coloured groups (in Clay, one pastel per group, as before) each carry an icon, and every chip opens the explainer. Hovering a group lights its edge.
- **Card hover:** every public card rises 4px, its border takes on the accent colour and its shadow deepens. Cards that hold a form (the admin editors) and cards inside dialogs are excluded.
- **Click effects:** every button now reacts to a click. The ones Arvind named each get their own effect:

  | Button | Effect |
  |---|---|
  | Any button | A ripple spreads from the click point |
  | Download (hero, résumé section, footer) | A progress bar fills and the arrow drops |
  | WhatsApp | A green "typing" bubble floats up and the button pulses |
  | Mail | A paper plane takes off |
  | Get in touch | A burst of sparks and a pop |
  | Call | The button rings |

  The click is never delayed or blocked, so downloads, mail and new tabs go ahead at once.
- **Footer:**
  - Three pulses travel along the top edge.
  - "Same processes." rises in word by word, and "Bigger possibilities." has a moving shimmer.
  - A live "Open to new opportunities" dot (a fact already stated in the footer's own text).
  - A "Back to top" link to `#main`, so it works on every page, with an arrow that launches on hover.
  - Links get an underline that slides in.
- **Text animation:** every section title rises in word by word as it scrolls into view (`SplitWords`, CSS view timeline). The spaces are real text, so each heading's accessible name is unchanged.
- **Robot buddies** (`robot-buddies.tsx`), on every theme and on phones:
  - The peeker leans in from a corner or a side edge every 12–22 seconds, looks around, and ducks back.
  - Two smaller robots run along the bottom in short sessions with 25–45 second gaps. One chases the other. Sometimes the first hides, the second looks for it, and the first pops up with "Boo!".
  - Tap or click a robot and it says hello. A double tap or double click spins its head under an orbit of stars, then it smiles ("Hehe!") or cries ("Waaah!") with tears.
  - Built with CSS transitions and keyframes on `transform`; JavaScript only picks targets and times.
  - The robots can be turned off with the "Robot buddies" checkbox on the admin Site defaults tab. They are not shown under reduced motion.

### Decision: robots on every theme

The hero robot stays Midnight-only, as before. The buddies are a different thing: a small, site-wide piece of play that Arvind asked to see on phones, not one theme's signature, so they appear on every theme. They are aria-hidden and not focusable. Controls that come and go would trap keyboard users, and the robots carry no content.

## Testing

| Check | Result |
|---|---|
| tsc | clean |
| ESLint (src) | clean |
| Vitest | 470 passed |
| Build | OK — shared 102 kB (unchanged), home 157 kB (unchanged) |
| New `delight.spec.ts` × 4 viewports | 32 passed once four test-side issues were fixed: an ambiguous text locator (3 viewports) and a timing bug in the peeker test |
| Accessibility, responsive, visual and G6 specs | 172 passed (axe, no overflow at any width) |
| Journey, assistant, case-study and security specs | 264 passed, 1 failed (the known portrait-order flake at 768px under load; passes alone, 4/4) |
| Mission, flicker and admin specs | 146 passed. The Clay header-band test failed once under 3-worker load; it passes alone and in a 2-worker run, and measures 0 changed pixels when run by hand |

Screens were checked by eye:

- the skills grid and its dialog (Clay light)
- the footer (Clay light, Crimson dark at 390px)
- click effects (WhatsApp bubble, download bar, paper plane, sparks)
- robots: peek, hello bubble, dizzy stars, crying face, and the chasers at 1440px and 390px

## Rollback

`git reset --hard pre-change-010` in the working copy the change was made in. To turn off only the robots, untick the box on the Site defaults tab.
