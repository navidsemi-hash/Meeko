# Motion inventory — meeko-template.framer.website

Measured in the live reference (1440×900 desktop, 390×844 mobile) by sampling computed
styles over time, synthetic and real hovers, and scroll sweeps. Implemented in
`css/styles.css` + `js/main.js`.

| Area | Reference behaviour (measured) | Implementation |
| --- | --- | --- |
| Easing | Reveals use a soft spring: ~93% at 450 ms, ~1.5% overshoot, settled ≈1.2 s | `--spring` CSS `linear()` curve generated from a damped spring (ζ 0.8) |
| Header | Fixed card nav; `top` 40 → 20 px once the page scrolls (~60 px). Never hides. | `.site-header.is-scrolled` |
| Nav links / buttons | Text roll: label slides up one line, a duplicate rises from below. Buttons also go `#fff → #f7f7f7` | `[data-roll]` wrapper added by JS, `aria-hidden` duplicate |
| Social icons | `#fff → #f7f7f7`, lift 2 px | `.icon-btn:hover` |
| Hero heading | Word by word: opacity 0, `blur(1px)`, `y 10px` → rest, ~0.1 s stagger | `.w` keyframes `word-in` |
| Hero avatar | Cross-fades between portraits every ~2.1 s (≈0.5 s fade) | `[data-avatar-cycle]` |
| Hero lead | Fade + `y 20px` spring after the words | `[data-reveal]` with delay |
| Hero stickers | Static (no float/parallax); fade + scale 0.95 → 1 after load | `.hero__stickers .sticker` keyframes |
| Service cards (desktop) | Start fanned into a deck behind the middle card (outer cards `x ±380px`, `rotate ∓6°`, Contact on top) and spread out as the page scrolls the first ~200 px, smoothed | `initFan()` scroll-linked + lerp |
| Service cards (mobile) | No fan; static list | fan disabled < 810 px |
| Arrow pills | Light tint → stronger tint on hover (blue `#e3f2ff→#d1e8fd`, yellow `#ffe7a9→#fede8d`, mint `#dbf5f0→#c8f0e8`) | `.arrow-btn` |
| Section headers / text blocks | Fade + `y 20px` spring when ~120 px into view | `[data-reveal]` |
| Selected works (desktop) | Sticky cards (`top 130/160/190/220px`), stacked in normal scroll; each earlier card scales down continuously to 0.85 / 0.90 / 0.95 / 1 as the section scrolls | `initStacks()` sticky + scroll-linked scale |
| Selected works (mobile) | Plain list | sticky off < 810 px |
| Testimonial | Click an avatar: it grows in place (64 → 80 px), others shrink; quote cross-fades. No autoplay. | `initTestimonials()` |
| Process (desktop) | Left column sticky at 180 px; cards sticky at `160/185/210/235px`, same 0.85→1 scale-down | `initStacks()` |
| Stats | Pills fade + scale 0.95 → 1, ~0.1 s stagger, no count-up | `[data-reveal="scale"]` |
| About | Photo blob fade + scale 0.95; copy fade-up; skills block fades in (~0.5 s delay) and bars grow with `width 1.5s ease-out` | `[data-skills]` |
| Availability badges | Ring text rotates continuously, ~24°/s (15 s/turn); badge tint darkens on hover | `.badge__ring` |
| Capabilities | Pills fade + scale 0.95 → 1, ~0.15 s stagger; hover tilts ±5° alternating | `.cap:hover` |
| Blog cards | No reveal, no hover change | (left static) |
| Footer CTA | Bubble scale-in → title/text fade-up → button `y 10px` (+0.35 s) → arrow + handwriting fade (+0.6 s) → copyright `y 10px` | `[data-reveal]` delays |
| Mobile menu | Separate dropdown card 14 px below the nav, fades/slides in over a `#1d1d1d` 60% scrim; icon morphs to ✕ | `.nav__panel`, `.menu-scrim` |
| Cursor / scrolling | No custom cursor; native scroll (no smooth-scroll library) | unchanged |

All of it is disabled under `prefers-reduced-motion: reduce` (content shown at rest,
stacks become plain lists, no spin/fan/cross-fade).
