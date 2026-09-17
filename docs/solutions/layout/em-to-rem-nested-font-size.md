---
title: em → rem is not a pure refactor under a non-root font size
date: 2026-09-17
category: layout
module: typography
problem_type: ui_bug
component: frontend
symptoms:
  - Home icon in the navbar shifts down when the cursor moves onto a thought
  - Sidebar breadcrumbs render larger after a conversion that did not touch the sidebar
  - The navbar's breadcrumb box grows while its font size stays fixed
  - Reproducible on iOS Safari only, not desktop Chrome or desktop Safari
  - A change reviewed as a pure refactor resizes elements at call sites nobody listed
root_cause: font_size_inheritance
resolution_type: code_fix
severity: medium
tags:
  - typography
  - font-size
  - rem
  - ios-safari
  - breadcrumbs
  - refactor
---

# em → rem is not a pure refactor under a non-root font size

## Problem

There are two font-size baselines in the app, and a third way for a size to arrive that belongs to neither.

The user's setting is written to the root element: a `useLayoutEffect` in [`AppComponent`](../../../src/components/AppComponent.tsx) keyed on `state.fontSize` sets `document.documentElement.style.fontSize`, so `1rem` *is* the setting. (The same effect sets an `--app-font-size` custom property, which nothing else in the tree reads.) [`panda.config.ts`](../../../panda.config.ts) pins `html, body, #root, #app` to `fontSize: '16px'`; the inline style overrides that on `<html>` and nothing overrides it on `<body>`. `AppComponent` then re-asserts the setting with `style={{ fontSize }}` on exactly three of its own containers — the modal wrapper, the [`Content`](../../../src/components/Content.tsx) wrapper, and the [`Footer`](../../../src/components/Footer.tsx) wrapper. Descendants of those three inherit the setting; everything else — [`Sidebar`](../../../src/components/Sidebar/Sidebar.tsx), [`NavBar`](../../../src/components/NavBar.tsx), `Toolbar`, `Alert` — inherits Panda's static 16px. #3487 added the root assignment and declined to remove the three spreads: "Not possible right now since many components inside AppComponent container still rely on `em` css unit."

So `em` resolves against 16px everywhere except inside those three containers, while `rem` resolves against the setting everywhere. [`ContextBreadcrumbs`](../../../src/components/ContextBreadcrumbs.tsx) has four call sites that straddle the line: [`Thought`](../../../src/components/Thought.tsx) and [`BulletCursorOverlay`](../../../src/components/BulletCursorOverlay.tsx) render under `Content`, `NavBar` renders beside it, and [`ThoughtLink`](../../../src/components/ThoughtLink.tsx) renders in the sidebar (its only consumers — `Favorites`, `RecentlyEdited`, `RecentlyDeleted` — all mount there). #3565 converted the component's `0.867em` to `0.867rem` on the evidence of `Thought`, where the two baselines coincide and the conversion genuinely is a no-op.

The ancestor is only half of it. In every property except `font-size`, `em` means *the element's own font size* — and a caller could overwrite that font size on the very same element through the `cssRaw` prop, which is what `NavBar` did:

```tsx
<ContextBreadcrumbs
  cssRaw={css.raw({ width: '100%', color: 'breadcrumbs', paddingLeft: '15px', fontSize: '14px', … })}
  path={breadcrumbSimplePath}
/>
```

The declarations #3565 edited inside the component were therefore resolving against 14px at that call site, a number that appears nowhere in the file being edited.

## Symptoms

At the navbar, the conversion did not move the font size at all — `cssRaw`'s `14px` wins before and after. It moved the box:

| Declaration | Before #3565 | After | Resolved in the navbar, at the default setting of 18 ([`constants.ts`](../../../src/constants.ts)) |
| --- | --- | --- | --- |
| `fontSize` | `0.867em` | `0.867rem` | 14px → 14px (overridden either way) |
| `minHeight` | `1em` | `0.867rem` | 14px → 15.606px |
| `marginLeft` | `calc(1.3em - 14.5px)` | `calc(1.1271rem - 14.5px)` | 3.7px → 5.79px |
| `marginTop` | `0.533em` | unchanged | 7.462px |

Two different conversion rules in one block, and the second is the tell: `0.867em` → `0.867rem` keeps the coefficient, while `1.3em` → `1.1271rem` keeps the *pixel value* — 1.3 × 13.872 = 18.03 = 1.1271 × 16 — which is right only while the root is 16px, and the root is never 16px once the setting is applied. The wrapper `div` the fix added to `NavBar` hardcodes `marginLeft: '3.7px', marginTop: '7.462px'`: the pre-conversion resolved values, restored by hand.

In the sidebar the ordinary ancestor case applies. `ThoughtLink` sets no font size, so its breadcrumbs went from `0.867 × 16 = 13.872px` to `0.867 × 18 = 15.606px`, and its own `marginTop: '1em'` grew with them.

Nothing about the reproduction points at a unit. #3649 was filed as a home-icon bug — the icon shifts down when the cursor moves onto a thought — reproduced on iOS Safari and not on desktop Chrome or desktop Safari, with the platform difference never explained, and located only by bisecting to fd30cc6, the merge of #3565. That PR had been reviewed against a checklist naming where each converted component is visible — "This PR is a pure refactor", with `ContextBreadcrumb` listed as "visible in the Context View". Neither the navbar nor the sidebar appeared on it, and those are the two that broke.

## What Didn't Work

**Reverting `ContextBreadcrumbs` to `em`.** The opening proposal of #3680, and the reason the rest of the thread exists. Rejected as policy — "The goal is to transition from em to rem, so this seems like backward progress to me. If rem is not feasible, what changes to the codebase need to be made to make it feasible?" — and rejected again on the merits when the sidebar came up: "`rem` is ancestor independent, while `em` is ancestor dependent. In general, converting `em` to `rem` will simply make ancestor dependencies explicit rather than implicit." A context whose base size does not track the user's setting is a design bug to fix, not a reason to keep the unit that hides it — "Seems like the problem is that the original font size did not scale with user font size."

**An explicit rem value passed at each call site.** Duplicates one intended size across the consumers that share it, and couples every call site to a visual decision, so any change to the component's own size has to be chased through all of them.

**A `useBreadcrumbScaler` hook** computing the ratio between a context's desired size and the component default (`14 / 15.606 ≈ 0.897`) — rejected under the thin-abstraction bullets in [code-standards](../../../.github/instructions/code-standards.instructions.md): "Abstraction is only beneficial if it hides complexity."

**Naming the variants after their consumers** so each could keep its exact historical size — rejected as an encapsulation violation, "Lower level components should definitely not be aware of how they are being consumed"; the near-identical 13.872px and 14px were collapsed into a single `small` instead.

## Solution

`ContextBreadcrumbs` selects a unit rather than a scale. `ContextBreadcrumbsVariant` is `'small' | 'default'`, the prop defaults to `'default'`, and the component computes `const fontSize = variant === 'default' ? '0.867rem' : '14px'`, applied as both `fontSize` and `minHeight` on its root. `NavBar` and `ThoughtLink` pass `variant='small'`; `Thought` and `BulletCursorOverlay` take the default.

The `cssRaw` overrides went with it. Per-consumer margin and padding moved onto a wrapper `div` at each call site — "Wrapper divs are a good solution when the margin/styles are on the 'outside' of the element" — and `ThoughtLink`'s records the substitution in place: `// Use static 14px marginTop to replicate the previous 1em spacing (font size was fixed at 14px).` That closes the hole the regression came through, since `cssRaw` is what let a parent overwrite an arbitrary declaration of the child; the reviewer's position is that it "was used in some places to facilitate the PandaCSS refactor, but it should be considered a temporary stopgap only."

What the comment above the ternary does not say is that `small` is a deliberately scope-limited stopgap of its own. A hardcoded `14px` does not track the user's setting at all, which is correct only by accident in the two places it is used: `NavBar`'s bar is transform-scaled by `fontSize / BASE_FONT_SIZE` so the px value still grows with the setting, while `ThoughtLink` sits in the sidebar, which has neither the container `fontSize` nor a `Scale`, so its breadcrumbs stay 14px at every setting. That was accepted to keep #3680 small, with an agreed follow-up — "a refactor on the sidebar's base font-size so we're not compensating downstream" — that has not landed in the six months since. `small` is the thing to fix, not the pattern to copy into a fifth context.

## Why This Works

`default`'s `0.867rem` is correct because both of its call sites descend from `Content`, where the inherited size already equals the root. `small`'s `14px` is stable across the two baselines because it names neither — which is exactly its defect, and why it is temporary.

Two other channels carry the same setting and are easy to mistake for this one:

| Channel | Where | What a unit change does to it |
| --- | --- | --- |
| CSS inheritance | `<html>` inline style, three `style={{ fontSize }}` containers | This trap |
| Pixel arithmetic off `state.fontSize` | [`usePositionedThoughts`](../../layout-rendering.md#usepositionedthoughts-x-and-y), [Indent](../../layout-rendering.md#indent-horizontal-autocrop), [`useSizeTracking`](../../layout-rendering.md#usesizetracking-and-the-sizes-map) | Nothing — the Redux value is read as a number |
| A JS scale factor | `NavBar`'s `const scale = fontSize / BASE_FONT_SIZE`, applied through [`Scale`](../../../src/components/Scale.tsx) | Multiplies whatever the CSS resolves to, so a converted value applies the setting twice |

`fontSize` reaches those three containers through the `style` attribute rather than a Panda token because Panda can only compile statically analysable values; see the PandaCSS bullets in [code-standards](../../../.github/instructions/code-standards.instructions.md). The setting itself comes from [Increase Font Size](../../commands.md#increase-font-size) and [Decrease Font Size](../../commands.md#decrease-font-size).

## Prevention

- **Enumerate the call sites, then read each one's overrides.** `grep -rn '<ComponentName' src --include='*.tsx'` gives the list. For each, two questions: which of the two baselines it inherits, and whether it overwrites the component's own `fontSize` on the element being edited. The second has no answer in the file you have open.
- **`em` is a font-size rule only inside a `font-size` declaration.** Anywhere else it means the element's own font size, so converting a `minHeight` or a margin detaches it from whatever the caller set, even when the font size itself is left alone.
- **Convert the coefficient, not the pixel value.** A constant derived by resolving an `em` against 16px — `1.3em` → `1.1271rem` — is wrong at every setting except 16.
- **Convert a component, not a file.** `ContextBreadcrumbs` is still mixed after the fix that named it: `delimiterStyle`'s `fontSize: '0.8em'` and the `staticText ? '0.8em' : undefined` span both resolve against the `0.867rem`/`14px` the same component sets a few lines below, so they move with the variant rather than with the root.
- **Leave the three `style={{ fontSize }}` spreads alone.** They look redundant beside the root assignment and are load-bearing for every `em` still in the tree — `grep -rEo "[0-9]em'" src --include='*.ts' --include='*.tsx' | wc -l` reports 244 against 120 `rem` literals. Deleting them is the next trap on this path, and it resizes everything at once.
- **Never convert a px value that renders inside [`Scale`](../../../src/components/Scale.tsx) to `rem`.** The transform already applies the setting; `NavBar` says so in a comment beside its home icon.
- **Ask for visual verification by call site, not by component.** The #3565 checklist listed components and where to find one instance of each; the two instances it missed are the two that broke.

## Related

- #3018, #3487, #3565, #3649, #3680
- [`usePositionedThoughts` (x and y)](../../layout-rendering.md#usepositionedthoughts-x-and-y), [Indent (horizontal autocrop)](../../layout-rendering.md#indent-horizontal-autocrop), and [`useSizeTracking` and the `sizes` map](../../layout-rendering.md#usesizetracking-and-the-sizes-map) — `state.fontSize` as pixel arithmetic, the channel a unit change does not touch.
- [Increase Font Size](../../commands.md#increase-font-size) / [Decrease Font Size](../../commands.md#decrease-font-size) — where the setting comes from.
- [code-standards](../../../.github/instructions/code-standards.instructions.md) — the PandaCSS bullets behind the `style` attribute, and the abstraction bullets behind the rejected hook.
