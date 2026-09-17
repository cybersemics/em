---
title: "A Panda class with no rule: stale extraction and unreadable variants"
date: 2026-09-17
category: styling
module: panda_css
problem_type: build_error
component: tooling
symptoms:
  - An element carries the right Panda class and the served styled-system has no rule under that name
  - Text Color and Sort toolbar icons render unstyled after switching branches with the dev server running
  - "A recipe variant computed at runtime produces no style at all, in dev and in production"
  - "panda codegen, a refresh, a cleared cache, vite --force and r in the Vite CLI all fail; only killing the dev server works"
root_cause: static_extraction
resolution_type: config_change
severity: high
tags:
  - panda-css
  - dev-server
  - yarn-patch
  - recipes
  - staticcss
  - vite
  - hmr
---

# A Panda class with no rule: stale extraction and unreadable variants

## Problem

The element in the DOM carries exactly the class Panda would have given it, and the served `styled-system` has no rule under that name. Two unrelated mechanisms produce that one symptom, and each looks like the other from the browser.

| | Stale extraction | A variant Panda never read |
| --- | --- | --- |
| What changed | Nothing in the source — you switched branches with the dev server running | A recipe is called with a variant value that is not a literal at the call site |
| Scope | One dev-server process | Every build, dev and production alike |
| Killing and restarting the dev server | Fixes it | Changes nothing |
| `panda codegen` | Does not fix it | Does not fix it |
| Remedy | Re-point the yarn patch — it is currently inert | Add the value to that recipe's `staticCss` |

Two neighbours share the shape and are neither of these. [`README.md` § Styles](../../../README.md#styles) says to restart the dev server or run `panda codegen` when styles get out of sync; `panda codegen` is the half of that advice that does not hold here, in either column. And a fresh worktree with no generated `styled-system/` at all fails earlier and louder — imports fail to resolve rather than rules going missing, and `yarn build:styles` fixes it. See [Quick Start](../../testing.md#quick-start).

Panda reaches the app through [`postcss.config.cjs`](../../../postcss.config.cjs), not through a Vite plugin. [`vite.config.ts`](../../../vite.config.ts) mentions Panda nowhere, so a search that starts there finds nothing and sends you looking at HMR.

## Symptoms

From #2390, after `git checkout` of another branch with the dev server already running:

- The Text Color and Sort toolbar icons render unstyled. The class reported on the Sort icon was `trf_translateY\(4px\)`, present in the `class` attribute with no matching rule in the loaded styled-system.
- `panda codegen`, a page refresh, a cleared browser cache, `r` in the Vite CLI, and `vite --force` all leave it exactly as it was. Killing the dev server and starting it again is the only thing that clears it.

From a runtime-valued recipe variant, at any time:

- The class is on the element, the rule is absent, and it is absent in a production build too. No test that asserts on class names sees it, and jsdom has no styles to disagree with.

## What Didn't Work

The reporter's first theory in #2390 was Vite: `src/index.css` carries a `__vite__css` variable that updates after `panda codegen`, "however it is missing styles". The variable updates correctly; the styles never existed to be shipped. The missing CSS is the extractor's, not Vite's, which is why every Vite-shaped lever on the list above does nothing.

#2420 first shipped the workaround through `patch-package` and was redirected in review to yarn's native `yarn patch`, the repo being on yarn 4 already. That is the right call and it is what produced the exact-version `resolutions` key that later went stale — see [Prevention](#prevention).

On the variant side, #2344 tried three things before `staticCss`:

| Attempt | Outcome |
| --- | --- |
| Target Panda's generated slot classes (`.modal__root`, `.modal__actions`) from `panda.config.ts` | Rejected: build artefacts, not type safe. Descendant selectors were tried first and did not work at all. |
| `defineParts`, raised as the documented alternative | Rejected as going further into proprietary slot machinery. |
| The recipe's `jsx` tracking array | Removed: it couples a recipe to the component names that consume it, and components get renamed. |

And the habit that formed around all of it, in the author's own words: "I've just run into so many cases where panda wasn't statically generating classes with conditional statements that I started automatically turning to variants instead." That is the wrong reflex. A ternary between two static values extracts fine, and inline `css()` is the repo default — [code-standards § CSS](../../../.github/instructions/code-standards.instructions.md#css).

## Solution

**Stale extraction.** [`.yarn/patches/@pandacss-node-npm-0.47.0.patch`](../../../.yarn/patches/@pandacss-node-npm-0.47.0.patch) comments out the early return in `Builder.extractFile`, forcing every file to be re-parsed on every pass. Its inline comment says what it changes and not what it prevents; the symptom it prevents is the whole first column of the table above.

**The patch is not applied today.** The `resolutions` key in [`package.json`](../../../package.json) is the exact-version string `"@pandacss/node@npm:0.47.0"`, while the tree resolves `@pandacss/node` to 1.12.1 — the copy the build pipeline uses, pulled by `@pandacss/dev@^1.12.1` — and to 1.9.0 under `@pandacss/eslint-plugin`, via its `^1.8.2` range. Neither matches. `yarn.lock` holds no `patch:@pandacss` entry, and the installed `node_modules/@pandacss/node/dist/index.js` still carries the unpatched guard verbatim. A version-pinned yarn `resolutions` key **fails open**: matching nothing is not an error.

**An unread variant.** Add the value to that recipe's `staticCss`. Seven recipes carry it, all bare and unexplained:

| Recipe | `staticCss` |
| --- | --- |
| [`thought.ts`](../../../src/recipes/thought.ts), [`modal.ts`](../../../src/recipes/modal.ts), [`anchorButton.ts`](../../../src/recipes/anchorButton.ts), [`slideTransition.ts`](../../../src/recipes/slideTransition.ts), [`fadeTransition.ts`](../../../src/recipes/fadeTransition.ts) | `['*']` — emit every variant |
| [`panelCommandRecipe.ts`](../../../src/recipes/panelCommandRecipe.ts) | `[{ isButtonExecutable: ['true', 'false'] }]` — the *string* literals, not booleans |
| [`panelCommandGroupRecipe.ts`](../../../src/recipes/panelCommandGroupRecipe.ts) | `[{ layout: ['small-2', 'small-3', 'small-4', 'medium-2'] }]` |

The other 18 recipes in [`/src/recipes`](../../../src/recipes) have none, so absence is not evidence a recipe is safe — only that nobody has called it dynamically yet, or that somebody has and nobody noticed.

## Why This Works

`Builder.extractFile` in `@pandacss/node` early-returns on `if (meta.isUnchanged && !hasConfigChanged) return;`, and `isUnchanged` compares a file's mtime against a module-level `fileModifiedMap`. `git checkout` does not move the mtime of a file whose content it did not change, so on the new branch those files are never re-parsed, and a class used only there is never emitted. Nothing in the pipeline invalidates that map short of the process exiting, which is why only a restart clears it.

`panda codegen` cannot stand in, because it does not read the source at all. It derives `styled-system/` from `panda.config.ts` and that config's import graph — the recipes and tokens — while the `include` globs drive extraction, which belongs to `cssgen` and to the PostCSS plugin. The JSDoc on [`scripts/build-styles.mjs`](../../../scripts/build-styles.mjs) draws the same line. The rule the browser is missing is not something codegen ever writes.

The second column is not a bug at any level. Panda extracts **statically**: it reads source text, not runtime values, so a recipe emits CSS for a variant only where the value is legible as a literal at some call site. `staticCss` is the declaration that says *emit this anyway*. Two live call sites are the shapes to recognize:

```tsx
// PanelCommandGroup.tsx — the variant name is built, then asserted
panelCommandGroupRecipe({
  layout:
    commandCount === 2 && size === 'medium'
      ? 'medium-2'
      : (`small-${commandCount}` as 'small-2' | 'small-3' | 'small-4'),
})
```

In [`PanelCommandGroup.tsx`](../../../src/components/CommandCenter/PanelCommandGroup.tsx), the hand-written union in the cast is the point: it suppresses the type error that would otherwise be the only remaining signal, and `panelCommandGroupRecipe`'s enumeration is what keeps the four classes alive.

[`FadeTransition.tsx`](../../../src/components/FadeTransition.tsx) calls `fadeTransitionRecipe({ type })` with a prop and hands the result — a slot-keyed object, since it is a `defineSlotRecipe` — straight to `CSSTransition`'s `classNames`. The names never appear as literals anywhere in the source, which is why `['*']` rather than an enumeration is the right guard there.

Nothing warns, by deliberate configuration. [`eslint.config.js`](../../../eslint.config.js) sets `@pandacss/no-dynamic-styling` to `0` because it also rejects ordinary conditional styles, and `@pandacss/no-config-function-in-source` to `0` because recipes live in `src/recipes/` rather than in `panda.config.ts` (#2739). Neither line carries a comment.

This is a property of static extraction, not of a Panda version. The source issues predate the 1.x upgrade and the constraint came through it unchanged.

## Prevention

**Every Panda bump re-points the resolution or retires it on purpose.** It has already been re-pointed by hand once, in f54607a9c0, which renamed the 0.45.1 patch #2420 shipped to the 0.47.0 name it still carries. Thirteen days later f8b53ef131 — "Upgrade testing library react to v14" — lost it: that commit changed one dependency in `package.json`, `@testing-library/react`, touched no Panda dependency, and regenerated `yarn.lock`, which moved the transitive `@pandacss/node` from 0.47.0 to 0.47.1 and deleted the `patch:` entry in the same diff. A lockfile regeneration is enough; a Panda upgrade is not required.

Confirm what is installed rather than what is declared, since the lockfile is the thing that silently changed:

```sh
grep -c 'PATCH: Always extract' node_modules/@pandacss/node/dist/index.js
```

`1` means the patch is live. `0` means it is not, whatever `package.json` says. Re-cutting it follows the multi-candidate `yarn patch -u` dance in [`.yarn/patches/README.md`](../../../.yarn/patches/README.md) — which describes three of the seven patch files in that directory and not this one. The react-dnd patches are also written up in [drag-and-drop § react-dnd patches](../../drag-and-drop.md#react-dnd-patches); this one appears in neither, part of why its disappearance in November 2024 went unnoticed.

**Prove a new variant is emitted before you trust it.** `cssgen` writes the same output the dev server serves, to a file you can grep:

```sh
npx panda cssgen --outfile /tmp/panda.css
grep -o '\.panelCommandGroupRecipe--layout_[a-z0-9-]*' /tmp/panda.css | sort -u
```

Run it whenever you add a variant to a recipe whose `staticCss` is an enumeration, or add the first non-literal call site to a recipe that has none. Extraction across the tree's 1500 files takes about 100 ms, the whole command under two seconds.

Both triggers are live in the tree right now, and the second one has an example. [`BulletPositioner`](../../../src/components/BulletPositioner.tsx) calls `bulletRecipe({ invalid })` with a value straight off `useSelector`, and [`bullet.ts`](../../../src/recipes/bullet.ts) declares an `invalid` variant with no `staticCss`. `grep 'bullet--invalid' /tmp/panda.css` returns nothing. Contrast [`invalidOptionRecipe`](../../../src/recipes/invalidOption.ts), which has no variants at all: a bare call is itself the literal, and `.invalid-option` is emitted.

**Read a class-name assertion as proving nothing about style.** The class is present in both the working and the broken case, so a test asserting on `className` passes either way. The gap is real and unclosed — see [void-area caret](../editing/void-area-caret-has-no-test.md) for the same shape in a different subsystem.

## Related

- #2390, #2420, #2344, #2739, #2170
- [`README.md` § Styles](../../../README.md#styles) and [§ Custom Dependencies](../../../README.md#custom-dependencies), for the baseline advice and for what `resolutions` and `yarn patch` are
- [`.yarn/patches/README.md`](../../../.yarn/patches/README.md) and [react-dnd patches](../../drag-and-drop.md#react-dnd-patches), for patch-authoring mechanics
- [code-standards § CSS](../../../.github/instructions/code-standards.instructions.md#css) — the `style` attribute is the escape hatch for a dynamic *value*; a recipe *variant* cannot go through it, and `staticCss` is the escape hatch instead
- [`/src/recipes`](../../folder-structure.md) in the folder structure
- [Quick Start](../../testing.md#quick-start), for the unrelated missing-`styled-system/` failure
