# Irene Ellis Art — Project Context

## Project
Single-page static portfolio website for Irene Ellis, an artist,
motivational speaker, and Master of Ceremony. Display/portfolio only —
no e-commerce, no login, no backend. Contact is via display details only.

## Tech
- Plain HTML, CSS, and vanilla JavaScript. No frameworks, no libraries.
- index.html, style.css, script.js at the project root.
- Built and previewed with Live Server in VS Code.

## Portfolio objects — stacked cards
- Each of the 3 categories is a stack of rounded cards (.cards/.card),
  fanned tight at rest and twisting further open on hover, plus a small
  grow. The pill button stays centred and never moves or grows.
- Each card now carries one artwork image (see "Images & assets"); the front
  card (card--5) shows the category's first image.
- These REPLACED an earlier crumpled-paper-ball idea (hand-generated SVG).
  Don't reinstate the balls.

## Portfolio transition — decided, do not redo
- three.js + GSAP were evaluated for a 3D paper-unfold and REJECTED.
  Prototypes proved a procedural crumple looks like glass shards, not
  paper; a convincing one needs a Blender-baked simulation we don't have.
- The showcase instead grows out of the clicked object and shrinks back
  into it, using FLIP (measure the .category rect -> transform the panel
  onto it -> release) with plain CSS transitions. No animation library.

## Brand palette (defined as CSS variables in style.css)
- Pink #eed0c8 — informational areas, kept readable
- Blush #f1dfd6 — soft rose-cream; About section background
- Rose #e6b8ab — deeper rose; Portfolio section background
- Tan #f4efe4 — decorative edges
- White #fdfdfd — backgrounds
- Text #2c2c2c — dark charcoal, all readable copy
- Dark end of the journey / UI accents (used lower down the page):
  Dark display #2A2826 (the portfolio showcase panel), scrollbar track
  #38332f, close-X accent #a8465a (a rose-red).
Aesthetic: soft watercolour, dandelion motif, feminine, calm.

## Palette journey (design direction)
- The page should flow from light at the top to darker toward the
  bottom, ending dark — a seamless, stylish gradient down the site,
  built only from the brand palette. Keep this in mind for every
  section's background as we build downward.

## Content rules
- Readable font for: the about paragraph, personal attributes, and
  contact details. Style can be more decorative elsewhere.
- Contact email placeholder: ireneellisart613@gmail.com (may change
  to sales@ireneellisart.co.za later — placeholder for now).
- Ignore the old Wix link entirely; it's not part of this site.

## Sections (single-page, in order)
1. Hero — "Irene Ellis Art" title, tagline, nav buttons (smooth-scroll)
2. About — portrait (images/irene-ellis.jpg) left, roles/services right, bio
3. Workshop Dates — up to four months of rose date buttons
4. Portfolio — 3 fanned card stacks of artwork; click opens the dark gallery
5. Contact — closing note over a drifting landscape; readable contact details

## Images & assets
- All images live in `images/`, referenced with relative paths.
- About portrait: `images/irene-ellis.jpg` (a tall portrait; cropped to the
  4:5 frame via object-fit:cover, object-position:center 20%). The file must
  be placed there by hand — the pasted image can't be saved from chat.
- Portfolio artwork: `images/portfolio/Category 1/`, `Category 2/`,
  `Category 3/` — each holds ~4–6 image files.
- ONE source of truth for the portfolio images: the `GALLERY` map in
  `gallery-data.js` (loaded by BOTH the public site and the admin page) lists
  each category's files. It drives the fanned cards, the site's dark gallery,
  AND the admin preview. To add/remove a piece: drop the file in its folder and
  edit that list. `gallery-data.js` must load before script.js and showcase.js.
  `window.GALLERY_BASE` is how each page reaches the images folder from where it
  sits (site uses the default `images/portfolio/`; admin sets `../images/...`).

## Portfolio showcase — the click-to-open gallery
- Clicking a category grows the panel out of the clicked card (FLIP) into a
  dark #2A2826 "display" panel (the dark end of the palette journey).
- Inside: a scrollable, 2-column masonry of that category's images — they keep
  their own sizes/aspect ratios. Shows ALL of a category's images (including
  any beyond the five cards).
- Custom scrollbar: rounded dark #38332f track + soft #f1dfd6 thumb, no arrows.
- Close control = a flat 2D page-fold in the top-right corner: the dark panel's
  corner folds back (curved flap, NO 3D shading) revealing a #eed0c8 triangle
  with a rounded rose-red (#a8465a) X. It's sized to the panel padding so it
  tucks above the scroll track without overlapping. Button has aria-label.
- SHARED CODE: the whole dark display lives in `showcase.css` + `showcase.js`
  (markup is `.showcase` inlined per page). Both the public site and the admin
  page `<link>`/`<script>` these, so they render the IDENTICAL panel — edit
  once, both update. Any element with `[data-category-open]` +
  `[data-category="…"]` opens it (site: category cards + workshop buttons;
  admin: each album's Preview button). Non-`.category` triggers grow from their
  own centre with a uniform scale (so a thin button never opens as a sliver).

## Admin page (/admin) — content editor
- Reached at `/admin`; Supabase login gates it (see admin/ files). Dark
  #2A2826 background, tan (#f4efe4) section panels, white month/album cards.
- Portfolio section: each category label has a **Preview** button that opens the
  SAME shared dark display (above) for that category, reading the SAME
  `gallery-data.js` images — so the admin preview mirrors the live site. Once
  Save is wired (Supabase), both the preview and the site read the saved source.
- NOT YET BUILT: saving/persistence. Editing dates/images only previews locally.

## Ring-bound book styling (binding, holes, cascade)
- The whole page reads as the LEFT page of a ring-bound book. A charcoal wire
  coil runs down the RIGHT edge, full document height — script.js fills it with
  <use> copies of one #bindRing SVG symbol and re-runs on resize/height change.
- Bottom-left has cascading page edges + a rounded bottom-left corner (also
  drawn by script.js).
- The punched holes were heavily iterated. CURRENT (keep simple): each hole is
  a plain dark-grey (#4a4644) filled circle with the ink wire extending to its
  bottom. The old "see the pages receding down the hole" depth effect was
  removed — don't reinstate unless asked.
- NOTE: the #bindRing symbol and the contact scene are hand-tuned SVG INLINED
  in index.html (originally built by throwaway Python generators not in the
  repo). Edit that inlined SVG directly.

## Contact section — drifting landscape
- A seamless, looping parallax landscape drifts left→right, scoped to the
  contact section only (built from the brand palette).
- Hill contours span the FULL width (immersive). Trees, plants and dandelion
  seeds are masked to appear only from the LEFT (where the front page begins)
  and fade toward the middle.

## Workshop Dates — date buttons
- Each date line ("18 Saturday 14:00") is a rounded-rectangle button in deep
  rose (--color-rose) that fades to light pink (--color-pink) on hover.
- These will become real clickable buttons later — keep the markup
  button-ready.

## Navigation — smooth scroll
- Nav links (and any in-page #anchor) smooth-scroll to their section via JS
  (ease-in-out), instead of jumping. Speed knob: `SCROLL_MS` in script.js.
  Respects prefers-reduced-motion (instant jump for those users).

## How I want you to work with me
- I am a beginner learning as I build. Explain choices simply.
- Work one section or one concern at a time. Do not build ahead.
- Before committing to anything ambiguous, ask me to clarify first.

