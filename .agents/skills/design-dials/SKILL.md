---
name: design-dials
description: >-
  USE THIS SKILL when a visual element has to match a design to the pixel and
  the right values are unknown: glows, overlays, spacing, typography, image
  crops. Asks what to target, wires every tunable value through a CSS custom
  property with the current value as its fallback, mounts a temporary dev-only
  panel of dials (and a WYSIWYG region picker for background images) so the
  user can tune live on real devices, then bakes the results back as scaling
  relationships and strips the panel.
allowed-tools:
  - bash
---

This is the **Design Dials** skill. It turns "make it look like the Figma" from a guess-and-screenshot loop into a
tuning session: the user drags sliders on the real app, on the real device, and reads off numbers; you translate
those numbers into relationships that hold on every device and delete the scaffolding. It was distilled from tuning
the pinned command overlay (`PinnedCommandTooltip`, the `pinnedCommand` glow in `src/recipes/notification.ts`);
the panel itself is archived at [`reference/PinnedCommandDebugPanel.md`](reference/PinnedCommandDebugPanel.md) and is
the worked example when this document is unclear.

Run `plan` first for the feature itself. This skill covers only the tuning apparatus and the bake.

## 1. Ask what to target

Ask, and do not guess, the following. One `AskUserQuestion` or a short list is enough.

- **Which elements**, by component: the glow image, the text row, a button, a diagram. Each becomes a section of dials.
- **Which properties per element.** Position and size are usually wanted; also ask about blur, opacity, colour, font
  size and weight, gaps. Unasked-for dials are noise, and every dial is a custom property you must later remove.
- **Which breakpoints and devices.** In this app the notification surface switches anchor at `lg` (600px), so
  portrait phones and everything wider are separate compositions with separate values. Ask which the user will tune
  on; the panel should say which branch is active.
- **What is fixed by design.** Figma geometry such as the ring's 73px box, an image's aspect ratio, a brand colour.
  These are not dials; they are constants the relationships are expressed against.

## 2. Wire values through custom properties

Every tunable value is read as `var(--<feature>-<element>-<prop>, <current value>)`. The fallback is the shipped
value; the panel only ever sets the property on `document.documentElement`, so production is untouched while the
panel is absent and **baking a result is editing a fallback**. Conventions that mattered:

- **One namespace per feature** (`--pinned-command-*`), sub-namespaced by element (`-glow-`, `-gesture-`,
  `-genie-`, `-row-`). Shared surface concerns get their own (`--notification-corner-*`).
- **A value read in two places must have the same fallback in both**, and each site says so in a comment naming the
  other. The ring's centring formula in `PinnedCommand` mirrors the row's height, offset and padding in
  `PinnedCommandTooltip`; when one changes, both change.
- **Panda extracts literals only.** A template literal with `${}` inside `css()` is silently dropped (see the memory
  note on this). Write the `var(...)` strings out in full; do not build them from constants.
- **Colours go through tokens.** The `@pandacss/no-hardcoded-color` rule rejects hex and rgba inside `css()`, and a
  `var(--x, #hex)` fallback counts. Add the tuned colour to `src/colors.config.ts` (both the dark and light blocks) and
  reference it as `token(colors.name)` inside the fallback.
- **Responsive values.** Panda refuses compound variants once any variant value is responsive
  (`assertCompoundVariant`). To vary a value by breakpoint inside a variant, key it by breakpoint
  (`{ base: ..., lg: ... }`) or set custom properties on the container from the anchor variant and read them below.
  The notification recipe does the latter for the anchor's geometry.
- **Prefer a CSS relationship to a measurement.** When two elements must line up, make the alignment a CSS
  expression rather than a `ResizeObserver`. The ring centres on the text row because the row has a fixed height, so
  its centre is padding plus half the height; wrapped text overflows the fixed row symmetrically. The user asked for
  this explicitly, and it removes a class of layout bugs.

## 3. Build the panel

One file, `<Feature>DebugPanel.tsx`, beside the component, and one mount line in `AppComponent`. Both are throwaway
and say so in a comment. The file grows; keep it flat and delete it whole. What it needs, learned the hard way:

- **Mount gate:** `import.meta.env.DEV && !navigator.webdriver`. The second half keeps it out of Puppeteer snapshots.
  A panel that leaks into a snapshot also brings its own races (image loads) and the baseline flips between runs.
- **Controls:** for each property a slider (numeric, with a unit) and a free text input for anything CSS. The text
  input's placeholder is the baked fallback, showing both breakpoints where they differ (`0px | 16px`). Empty means
  fallback. Group into collapsible sections; persist which are open.
- **Do not dismiss what you are tuning.** Overlays close on outside pointer events, so the panel root stops
  `mousedown` and `touchstart` propagation.
- **Copy and reset.** "Copy overrides" puts the set values on the clipboard as JSON; that JSON is what the user
  hands back, so it is the bake's input. A per-section reset saves clearing ten fields by hand.
- **Popup window.** Tuning on a phone-sized viewport leaves no room for the panel. `window.open` plus
  `createPortal` into the popup's `body`, with the main document's `<style>`/`<link>` elements and the `html` and
  `body` attributes copied across (theme tokens hang off `data-color-mode` on `body`). The component still runs in
  the main window, so state and the custom properties stay there. Clipboard writes must use the popup's `navigator`,
  because user activation belongs to the window that was clicked.
- **Resize and zoom** with pointer events, not CSS `resize`, so it works on the simulator's touch screen. Divide
  pointer travel by the zoom factor.
- **Say which branch is active** (`base / bottom-full`, `lg / bottom-right`) in the header, from `matchMedia`.

### The region picker for background images

For a glow or any `background-image`, sliders for `background-size` and `background-position` are unusable; the
user needs to see the crop. Render the whole image as a thumbnail and draw two rectangles on it: the visual viewport
in image coordinates (solid, draggable, with a corner handle that zooms keeping the viewport's aspect) and the
element's box (dashed; the image is clipped outside it). Read the current geometry from computed style, resolving
`cover`, `contain`, percentages and `auto` to pixels so the first drag continues from the shipped crop. Details that
made it feel right:

- **Draw from local drag state** and write the override once per animation frame. Waiting for the value to round-trip
  through computed style lags a frame and feels loose.
- **The stage must not move under the pointer.** Size it to the union of image, viewport and box, and make it a ref
  that only grows. A stage recomputed from the rectangle shifts the canvas mid-drag, and a floating-point
  containment check can loop React.
- **Zoom on the dominant axis**, whichever the pointer moved more along relative to the rectangle, so a diagonal drag
  keeps the corner under the finger.
- **Emit a relative readout** beside the absolute values (see §4) with its own copy button. Tuning stays in pixels
  because that is what the user sees; baking is in relationships.

## 4. Bake as relationships, not pixels

A number dialed in on one device is right only on that device. Before baking, decide what each value is relative to:

- **Text-relative metrics** (font sizes, gaps between text and its icon, offsets that align to text) become `rem`,
  with the app's `DEFAULT_FONT_SIZE` (18px) as the base, so they follow the user's font size setting together.
- **Width-driven compositions** (a glow spanning a portrait phone) become `vw`, anchored to the bottom, with
  `env(safe-area-inset-bottom)` added to the anchor so the composition follows the text above the home indicator.
  Sizing from width also sidesteps iOS Safari's unstable `vh`.
- **Height-driven compositions** (the same glow in a landscape corner) become `vh`, capped at the tuned size with
  `min()`/`max()` so tablets and desktop get the phone composition instead of a room-sized one. Cap every value at the
  same viewport height so proportions hold.
- **Image crops** become the image's footprint: the element _is_ the image, with `aspect-ratio` from the file's
  pixel dimensions, `background-size: 100% 100%`, and width and anchors in the units above. The picker's readout
  prints this form directly. Constants wedded to the image live in the aspect ratio; everything else is device.
- **Figma geometry stays px** and relationships are expressed against it (the row's right padding is the ring's
  visible radius times its scale).
- **Children of a tuned box** (a glow behind a diagram) are sized as percentages of that box, so they are
  device-independent by construction.

Convert the user's JSON, update the fallbacks and the panel placeholders, and verify at three widths in headless
Chrome: read element rectangles, not screenshots. Emulate touch when copy differs for touch devices. Pass
`--disable-blink-features=AutomationControlled` when the run must see the panel or real animation durations.

## 5. Strip

When the user says the values are final:

1. Delete the panel file and its mount line and comment in `AppComponent`.
2. Replace every `var(--<feature>-…, value)` with `value` where nothing else reads the property. Keep a property only
   if runtime code sets it (the ring's `--pinned-command-lift` is the tooltip's opacity and stays).
3. Remove the tokens, colour or otherwise, that only the panel used; keep the ones the component reads.
4. Update the docs that mentioned the panel, regenerate the snapshots that the final values changed, and run lint.
   `end-session` covers the rest.

## Failure modes to avoid

- **Measuring in JS what CSS can express.** It works until layout changes underneath it.
- **Tuning one breakpoint and baking it for all.** Ask which branch the user tuned on; bake that branch only.
- **Sizing text in px and spacing in rem, or the reverse.** Pick rem for everything text-relative, and check that a
  large font setting still looks like one composition.
- **Leaving the panel gated on a query parameter the user has to remember.** Gate on development plus not-automated;
  a panel the user cannot open is not tuned with.
- **Regenerating snapshots without saying why.** Each regeneration in this process was an intended change; name it.
