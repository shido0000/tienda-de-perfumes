# Design direction — Mist & Mood

**Niche perfumery, reservations only.** Quiet, editorial, a little nocturnal.
Spanish (Argentina).

The typography, palette and rules below are the authoritative ones for this
project.

## Type

- **Display: Cormorant Garamond** (300/400/500) — brand wordmark, page titles,
  product names. High contrast, generous letter spacing at large sizes.
- **Body / UI: Karla** (400/500/600) — navigation, labels, prices, forms, body copy.
- Two families only. Both are loaded from Google Fonts in `app/layout.tsx`
  (see `next/font/google`) with `display: swap`.
- Scale (4–5 sizes): 13px meta/label · 15px body · 17px lead · 24px section
  heading · clamp(32px, 5vw, 56px) page title. Weights: 300 display, 400 body,
  500 emphasis. Line length kept under ~80 characters; figures use
  `tabular-nums` in cart, receipt and admin tables.

## Colour — token roles (values live in `app/globals.css`)

| Token | Role |
| --- | --- |
| `bg` | page ground — ivory (light) / near-black (dark) |
| `surface` | cards, sheets, drawers, header bar |
| `ink` | primary text |
| `muted` | secondary text, meta |
| `line` | hairlines, inputs, dividers |
| `primary` | burgundy — primary action, active nav, focus ring |
| `on-primary` | text on primary surfaces |
| `accent` | old brass — small marks, prices, seals |
| `success` / `danger` | reservation status |

One accent used sparingly. Never colour alone for meaning: status always
carries a word too. Text contrast ≥ 4.5:1 (≥ 3:1 for large display type).

Tailwind maps these in `tailwind.config.js` (`theme.extend.colors`), so
components use token utilities only — `bg-bg`, `bg-surface`, `text-ink`,
`text-muted`, `border-line`, `bg-primary`, `text-accent`. **No raw hex and no
default palette classes** (`gray-*`, `indigo-*`, `blue-500`) anywhere in
`app/` or `components/`.

## Theme toggle

Light is the default; dark is a `.dark` class on `<html>`. The sun/moon button in
the header (and in the mobile menu) flips it, stores the choice in
`localStorage["mistmood_theme"]`, and the inline script in `app/layout.tsx`
applies the saved class before first paint so there is no flash. With no saved
choice the OS `prefers-color-scheme` wins. Dark tokens are near-black grounds
(18 16 15 / 28 25 23) with warm ivory text, the burgundy accent lightened to
a dusty rose for contrast, and shadows deepened — same token names, so every
component follows without per-component overrides.

## Shape, spacing, depth

- Radii: `rounded-control` 6px (inputs, buttons), `rounded-card` 14px (cards),
  sheets 18px. Never `rounded-2xl` on everything.
- Spacing on a 4px grid. Whitespace separates sections before borders do.
- Shadows: very soft, ink-tinted, single layer. No glassmorphism.

## Motion

Only where it shows what changed — drawer opening, item added to the cart,
reservation status change. Easing `ease-theme`, 150–350 ms, transform and
opacity only. Honour `prefers-reduced-motion`.

## Screens

- Landing: full-bleed title block, then the catalogue. One focal element.
- Catalogue: filter chips by olfactory family (Amaderado, Clásico, Floral,
  Fresco, Oriental, Nicho, Sets) + search; grid of fragrance cards.
- Fragrance card: photo, house (brand), name, olfactory family, price in the
  selected currency.
- Detail page: notes pyramid (salida · corazón · fondo) and a reservation CTA.
- Receipt: monospaced-in-body figures, tabular numbers.
- Admin: dense tables, inline status controls, form panels per section.

Copy & imagery: quiet, precise, olfactory vocabulary. Spanish (Argentina).
Prices, hours and contact details come from the store settings only — never
retyped in the footer.

## Avoid

cartoon illustrations, candy stock photos; gradients as decoration;
glassmorphism; rounded-2xl on everything; ALL-CAPS eyebrow labels in long
strings; purple/indigo gradients; stock-palette cream+terracotta clichés taken
to the letter (the burgundy/brass accent is the difference).
