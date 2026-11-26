# Gait Check – Style Guide

This file describes how the Gait Check website looks, reads and behaves. The tokens live in
`site/site.css` under `:root`. If you change a value there, change it here too.

## What the site should feel like

Calm, precise, premium. The site borrows its look from the app: warm paper, one deep green, a lot
of quiet space. It is read on a phone at the stable, so the phone layout is the real layout and the
desktop layout is the adaptation.

Three rules decide most questions:

1. **Phone first.** Design and check every change at 390 px wide before looking at desktop.
2. **Less on the page.** One idea per section, one or two short paragraphs. If a section needs a
   third paragraph, cut something.
3. **Show the app whole.** App screenshots are never cropped.

## Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F3F0E8` | Page background |
| `--paper` | `#FBFAF6` | Cards, raised surfaces |
| `--sand` | `#ECE7DC` | Alternating section background |
| `--band` | `#E8DFD0` | The "usual range" band in charts |
| `--line` | `#E2DCCF` | Hairlines and dividers |
| `--ink` | `#151515` | Headings, primary text |
| `--text` | `#3E3B35` | Lead paragraphs, list items |
| `--muted` | `#5F5B53` | Body copy, captions |
| `--green` | `#4F5E33` | Buttons, links, accents |
| `--green-d` | `#3F4A2A` | Hover and pressed states |
| `--green-l` | `#E3E8D8` | Soft green fills |
| `--olive` | `#9DAF7A` | Accents on dark backgrounds |
| `--red` | `#B83A2E` | A flagged change, nothing else |
| `--dark` | `#161812` | The one dark section (For vets) |

- Green is the only brand colour. Red means "something changed" and is never decorative.
- Dark is used for one full section at most. No dark bars or strips between sections.

## Type

| Role | Face | Size (phone → desktop) | Weight |
|---|---|---|---|
| Hero headline | Playfair Display | 46 → 88 px | 700 |
| Section headline | Playfair Display | 32 → 50 px | 700 |
| Card title | Inter | 19 → 20 px | 700 |
| Lead | Inter | 18 → 20 px | 400 |
| Body | Inter | 16 → 17 px | 400 |
| Small | Inter | 14 px | 400 |
| Label (eyebrow) | Inter | 12 → 13 px, uppercase, 0.12em | 700 |

- Playfair is for headlines, the quote and numerals. Everything else is Inter.
- Headlines use `text-wrap: balance`. Body lines stay under about 70 characters.
- Italic green is reserved for one word in the hero and the closing call to action.
- **No full stop at the end of a headline or any other short line.** Write "Meet Blume", not
  "Meet Blume.". This covers headlines, card titles, button labels and labels. If a headline
  needs two sentences, join them with a comma or rewrite it as one. Body copy keeps its full stops.

## Numbering

- Count **1, 2, 3**. Never write a leading zero (no 01, 02, 03).
- Number only real sequences: the three steps and Blume's timeline. Do not number lists whose
  order does not matter.

## Space and shape

| Token | Value | Use |
|---|---|---|
| `--gutter` | 20 px phone, 24 px from 561 px | Side padding of the page |
| `--sec` | 72 px phone, 104 px desktop | Vertical padding of a section |
| `--r-s` | 14 px | Buttons, small chips |
| `--r-m` | 22 px | Cards, FAQ items |
| `--r-l` | 32 px | Photos, chart card |
| `--r-phone` | 38 px | App screenshots (device frame) |
| `--shadow` | `0 24px 56px rgba(40, 40, 20, .16)` | Screenshots and the chart card only |

- Text cards have no shadow. Shadows are for things that float: screenshots and the chart.
- Tap targets are at least 48 px high. Primary buttons are full width on phones.
- Respect the notch: the nav and footer use `env(safe-area-inset-*)`.

## Images

- **App screenshots** (`site/img/*.jpg`, 520 × 1125) are always shown complete, in their own
  aspect ratio, inside the device frame (`.shot`). Never use `object-fit: cover` with a different
  aspect ratio on them, and never use them as a cropped card header.
- **Photos** keep their natural ratio too. Blume's portrait is 3:4 at every width.
- Every `<img>` has `width` and `height` attributes so the page does not jump while loading.
- Screenshots that sit side by side on desktop stack on phones. In the three steps (`.steps`) each
  row shows the screenshot on the left and the text on the right.
- **The page only scrolls up and down.** Nothing may be wider than the screen, and there are no
  sideways swipe rows or carousels.
- A section headline stands above its picture on phones, never below it.

## Components

- **Button** `.btn`: green, 14 px radius, 600 weight. `.ghost` for the secondary action,
  `.light` on dark and green backgrounds. One primary button per screenful.
- **Device frame** `.shot`: paper background, 38 px radius, thin ink ring, soft shadow.
- **Hero phone**: on desktop the live demo runs inside the phone. On phones it is a still
  screenshot that opens the demo full screen, because an app inside a phone inside a phone traps
  scrolling.
- **Timeline** `.timeline`: numbered circles, used for a real order of events.
- **Chart card** `.chart-card`: ink line, sand band for the usual range, red for the change.
- **Tracking readout** `.tech`: the trot clip with tracking points, shown whole, and a calm readout
  below it: one large symmetry value, a small chart in the app's chart style, and three supporting
  numbers. It updates once every four strides with a soft fade, never faster. No tickers, no
  scrolling traces, no formulas. The values are simulated, and the note under the card must say so.
- **Q&A** `.faq`: native `<details>`, one open question does not close the others.

## Motion

- Sections fade up 12 px once when they scroll into view. The chart draws itself once.
- Nothing loops except the small live dot next to the desktop demo.
- Everything is switched off under `prefers-reduced-motion`.

## Navigation and the back button

- Links to sections on the page scroll there without adding a history entry. One press on
  "back" always leaves the page.
- Inside the demo app, the home screen is the only history stop. Moving between screens replaces
  the current entry, so "back" goes to the home screen and the next "back" leaves the app.
- The demo embedded in the desktop hero never adds history entries.

## Voice

- Plain English, short sentences, sentence case. Talk to the rider: "your horse", "your vet".
- Say what the app does, then stop. No superlatives.
- Never claim a diagnosis. Gait Check detects and documents changes. Vets decide.
- Be honest about status: the product is in development and the demo's analysis is simulated.
- Prices and planned features are marked as planned.

## Checklist before a change goes live

- [ ] Looks right at 390 px, 768 px and 1280 px
- [ ] No horizontal scroll on the page at any width
- [ ] No screenshot or photo is cropped
- [ ] No number starts with a zero
- [ ] No headline or short line ends with a full stop
- [ ] Back button leaves the page in one press, and the app in two at most
- [ ] Keyboard focus is visible, reduced motion is respected
