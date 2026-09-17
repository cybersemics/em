---
title: A Panda css() class cannot override an unlayered vendor stylesheet
date: 2026-09-17
category: styling
module: panda_css
problem_type: convention
component: frontend
severity: medium
applies_when:
  - Replacing an inline style on a third-party component with a css() class
  - Overriding a declaration that came from a stylesheet inside node_modules
  - "Debugging a css() declaration that has no effect although its class is on the element"
  - Adding a dependency that ships its own stylesheet
tags:
  - panda-css
  - cascade-layers
  - rc-slider
  - inline-style
  - vendor-css
  - touch-action
---

# A Panda css() class cannot override an unlayered vendor stylesheet

## Context

[`src/index.css`](../../../src/index.css) declares the order `@layer reset, base, tokens, recipes, utilities`, and [`panda.config.ts`](../../../panda.config.ts) does not rename the layers, so every `css()` call in the app is emitted into `utilities`. A stylesheet that declares no layer does not take part in that ordering: an unlayered rule outranks every layered rule, at any specificity, in any source order. Panda's whole output therefore sits beneath any stylesheet that arrives without a layer.

One does. [`UndoSlider`](../../../src/components/UndoSlider.tsx) pulls in rc-slider's stylesheet as a bare side effect — `import 'rc-slider/assets/index.css'` — and that sheet sets `.rc-slider-handle { touch-action: pan-x }`. It is the only stylesheet in the tree carrying selectors that Panda competes with; the two font sheets linked from [`index.html`](../../../index.html) declare nothing but `@font-face`. The constraint is about layering rather than about rc-slider, so any package stylesheet added later arrives on the same footing.

[`code-standards`](../../../.github/instructions/code-standards.instructions.md#css) points straight into it: style with `css()`, and keep the `style` attribute for dynamic runtime values. An override of a vendor rule is usually a handful of static declarations, which reads as a licence to convert — and converting is the one thing that cannot work.

## Guidance

Deliver the override inline. On the undo slider — the `<Slider>` inside `UndoRange` in [`UndoSlider.tsx`](../../../src/components/UndoSlider.tsx) — that is rc-slider's `styles` prop, whose `handle`, `rail` and `track` keys are spread onto those elements' `style` attributes; inline declarations beat unlayered ones, which is the property that matters. The prop's name is incidental — rc-slider also accepts `classNames` with the same three keys, and a Panda class handed to it targets the right element and still loses.

| Delivery | Beats `.rc-slider-handle { touch-action: pan-x }` |
| --- | --- |
| `className` or `classNames` holding `css({ touchAction: 'none' })` | No. `@layer utilities` loses to an unlayered rule. |
| `styles={{ handle: { touchAction: 'none' } }}` | Yes. The declaration lands in the `style` attribute. |
| `css({ touchAction: 'none !important' })` | Yes — an important declaration outranks a normal one from anywhere — at the price of a declaration nothing downstream can override. |
| `@import 'rc-slider/assets/index.css' layer(base)` from a stylesheet | Would drop the vendor sheet below `utilities` and restore ordinary precedence. Untried here, and it moves the import out of the component. |

The comment above the `styles` prop says what `touch-action: none` buys and cites #4329. It says nothing about the delivery mechanism, so a reader holding only that comment has no reason not to tidy the prop away.

## Why This Matters

The Panda form of this override typechecks, passes lint, puts a class on the element and emits a rule — and changes nothing. In #4382 it read as the fix not working, which sends the next move back to the touch handling rather than to the cascade. Specificity intuition agrees with the mistake, since `.rc-slider-handle` is one class and a single-class utility written later ought to win.

Two silent Panda failures are indistinguishable at the element. In [`panda-class-with-no-rule.md`](panda-class-with-no-rule.md) there is no rule behind the class; here the rule exists and loses the cascade. The Styles pane separates them in one look: a rule that was never emitted is absent, a rule that lost appears with its declaration struck through under the winner.

Neither is caught automatically. Vitest processes no CSS — `css` is unset in [`vitest.config.ts`](../../../vitest.config.ts) — so the jsdom suite, [`UndoSlider`'s own tests](../../../src/components/__tests__/UndoSlider.ts) included, holds no stylesheets and computes nothing. The behaviour the declaration protects is mobile-only and intermittent, and only shows up once undo history is deep enough to carry the handle into the [scroll zone](../../commands.md#gesture-activation) on the right, so it does not reproduce under a desktop pointer either.

## When to Apply

- **Before converting an inline style on a third-party component to `css()`**, find out what the declaration is fighting. `grep -rn "\.css'" src` lists every stylesheet the bundle imports; anything resolving into `node_modules` is unlayered and wins.
- **When adding a dependency that ships CSS**, decide at import time whether to bring the sheet into a layer. Afterwards every rule it ships outranks the entire design system, and each collision has to be settled one declaration at a time.
- **To prove an override applied**, assert the computed value in a Puppeteer test rather than a class name: `getComputedStyle(el).touchAction`. Puppeteer serves the real stylesheets, and the suite already reads computed values this way — [`gestureMenu.ts`](../../../src/e2e/puppeteer/__tests__/gestureMenu.ts) asserts a computed `paddingLeft`, [`color.ts`](../../../src/e2e/puppeteer/__tests__/color.ts) a computed `backgroundColor`. A class-name assertion passes under both silent failures.

## Examples

Both of these put a `touch-action: none` declaration on the rc-slider handle. Only the second one reaches the element.

```tsx
// Loses: the class is emitted into @layer utilities, which the unlayered .rc-slider-handle rule outranks.
<Slider classNames={{ handle: css({ touchAction: 'none' }) }} />

// Wins: rc-slider spreads styles.handle onto the handle as an inline style.
<Slider styles={{ handle: { touchAction: 'none' } }} />
```

The first is the form a cleanup pass produces, because it is the form the standards ask for. Its computed `touch-action` is still `pan-x`.

## Related

- #4382, #4329 — the undo slider drag that the inline `touch-action: none` fixed, and where the layer precedence was worked out.
- [`panda-class-with-no-rule.md`](panda-class-with-no-rule.md) — the other silent Panda failure, where the rule was never emitted.
- [Commands → Undo history and the undo slider](../../commands.md#undo-history-and-the-undo-slider) — what the slider is and how its handles behave.
- [`code-standards` → CSS](../../../.github/instructions/code-standards.instructions.md#css) — `css()` for styling, the `style` attribute for dynamic runtime values.
