---
name: liminal
description: Style a static artifact (a standalone HTML page or report generated outside the app) like em's Liminal UI — white on black over a soft background glow. Use when the user asks for "liminal" styling, "style it like em", or em's look for such a page. Never use it to change em's own UI, components or styles.
---

# Liminal

em's Liminal UI is white text on pure black, lit from below by a soft blue-violet glow. It uses one theme only: never add a light mode.

This skill is only for static artifacts built outside the app. It never applies to em's own components, recipes or styles: those use Panda tokens and `colors.config.ts`, not this CSS.

## Glow

Publish em's `public/img/glow/glow-3a.avif` next to the page as `glow.avif` (for an Artifact, pass it in `files`). Put the glow layer first in the body and lift the content above it:

```html
<div class="glow" aria-hidden="true"></div>
<main>…</main>
```

## Tokens and base CSS

```css
:root {
  --bg: #000000;
  --fg: rgba(255, 255, 255, 1);
  --muted: rgba(255, 255, 255, 0.62);
  --faint: rgba(255, 255, 255, 0.14);           /* hairlines, borders */
  --panel: rgba(255, 255, 255, 0.045);          /* raised surfaces */
  --highlight: #add8e6;                         /* em's dark highlight (lightblue): links, accents */
  --highlight-soft: rgba(173, 216, 230, 0.12);
  --font-body: Helvetica, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  color-scheme: dark;
}
html, body { background: var(--bg); }
body { color: var(--fg); font: 16px/1.6 var(--font-body); }
.glow { position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: url("glow.avif") bottom center / cover no-repeat; opacity: 0.6; }
main { position: relative; z-index: 1; max-width: 760px; margin: 0 auto;
  padding-inline: 20px; padding-block: 48px 96px; }
a { color: var(--highlight); }
```

## Conventions

- Headings are bold Helvetica with slightly tight letter-spacing (`-0.01em`). Don't use a display serif.
- Surfaces are translucent white (`--panel`) with a `--faint` border and an 8px radius, so the glow shows through. Don't use opaque grey cards.
- Use `--highlight` sparingly, for links, a left rule on quotes, and small markers. Any second accent goes in as a soft translucent tint.
- Wrap long unbroken text (`overflow-wrap: anywhere` on links, `white-space: pre-wrap` on `pre`), so nothing scrolls sideways on a phone.
