# Solutions

Durable learnings recovered from closed issues and merged pull requests: the non-obvious cause, the approach that looked right and failed, the guardrail that keeps it from happening again.

This directory sits **beside** [`docs/`](../readme.md), not inside it and not instead of it. The two are written for different moments.

|  | [`docs/`](../readme.md) | `docs/solutions/` |
| --- | --- | --- |
| Answers | "What is this and how does it fit together?" | "Why did this bite us, and what did we try that didn't work?" |
| Read when | Orienting in an unfamiliar subsystem | Standing in front of a symptom, or about to touch a mechanism that has burned someone |
| Scope | A subsystem, described whole | One problem, described deeply |
| Tense | How the project works **now** | How the project works now, plus the history that explains why |
| Shape | Prose and tables, organised by subsystem | Frontmatter + a fixed section order, organised by subsystem |

A solutions doc **links to** `docs/` for mechanism and never restates it. If a learning needs three paragraphs of background that [`data-model.md`](../data-model.md) already carries, it links to the section and writes only the delta. When a learning reveals something `docs/` *should* describe but doesn't, fixing that is [`docs-sync`](../../.github/skills/docs-sync/SKILL.md)'s job, not this file's — the solutions doc says what the trap is and points at where the mechanism lives.

## The bar

A learning earns a file here only when it holds reasoning that is **not recoverable from the final code, its tests, its types, its comments, or the existing docs**, and losing it would plausibly cause the mistake to recur or force someone to redo the investigation.

The test is a counterfactual: *if this file did not exist, would an engineer reading today's implementation still likely repeat the mistake?* If the diff explains itself, there is nothing to write. Effort spent, diff size, and the fact that something was fixed do not qualify a learning — most fixed bugs fail this bar, and that is the expected outcome.

Three things disqualify a candidate outright:

- **Already said.** Anywhere in `docs/`, [`AGENTS.md`](../../AGENTS.md), [`code-standards`](../../.github/instructions/code-standards.instructions.md), [`testing`](../../.github/instructions/testing.instructions.md), or a lint rule in [`packages/eslint-plugin-em`](../../packages/eslint-plugin-em). The glossary in particular often carries the whole lesson inside a single definition.
- **Gone.** The code, component, or behaviour has been removed or substantially refactored since. A learning about a mechanism that no longer exists is worse than no learning, because it reads as current.
- **Generic.** Advice any competent engineer would apply without this repo's history.

## Shelf life

Closed issues go stale, and in this repo they go stale on a datable schedule. The platform was rebuilt underneath the feature code, so an item's age tells you which rebuild it predates:

| Landed | Change | What it dates |
| --- | --- | --- |
| 2024-04-30 | create-react-app → Vite, and Jest → Vitest in the same push | Build, dev-server, env-var, bundling, and unit-test learnings |
| 2024-05-16 | `src/reducers/` + `src/action-creators/` → `src/actions/` | Every path and import in a state-mutation learning |
| 2024-07-23 | CSS → Panda CSS | Styling, theming, and class-name learnings |
| 2024-11-10 | YJS doclog, `replicationController`, and `ThoughtspaceExtension` removed | Sync and replication learnings |
| 2024-12-03 | `src/shortcuts/` → `src/commands/` | Command, keyboard, and gesture learnings |
| 2026-08-20 | TreeCRDT thoughtspace replaces YJS entirely | Everything about how a thought reaches storage |

Anything closed before 2024-04 predates every one of these and is presumed obsolete unless it survives an explicit check; the last entry is under a month old, so even a 2026 persistence learning needs one. Confirm a mechanism still exists in the current tree before writing about it — `git log -S'<symbol>' --oneline | head` is usually enough to tell a live mechanism from a fossil.

## Layout

Organised by subsystem, mirroring `docs/`, so the two trees read together: a reader in [`layout-rendering.md`](../layout-rendering.md) finds `solutions/layout/` where they expect it. The problem type lives in frontmatter rather than the directory name, which keeps "show me every test failure" a query rather than a second taxonomy.

<!-- index:start -->
### `editing/` — Editing, caret, and selection

- [isActive, isThought, and isNote answer different questions](editing/selection-predicate-semantics.md)
- [Never consolidate Editable's tap handlers onto mousedown](editing/tap-handler-event-ownership.md)
- [Void-area caret tests pass whether or not the bug is present](editing/void-area-caret-has-no-test.md)

### `data-model/` — Thoughts, lexemes, paths, and ids

- [Changing normalizeThought re-keys every Lexeme, and there is no migration to write](data-model/changing-lexeme-hashing-is-not-a-migration.md)
- [Context view entries keep their real lineage, so attributes leak in](data-model/context-view-entries-keep-their-real-lineage.md)
- [Editing a thought overwrites the persisted Lexeme with only the loaded contexts](data-model/lexeme-contexts-clobbered-when-not-loaded.md)
- [toggleAttribute treats a container of meta siblings as empty](data-model/nested-attribute-container-cleanup.md)
- [A Path is assignable to a Context, so the brand protects one direction only](data-model/path-is-assignable-to-context.md)

### `persistence/` — Storage, sync, and replication

- [On an insecure origin, three unrelated-looking failures have one cause](persistence/insecure-origin-silent-degradation.md)
- [savingProgress has had no writer since the TreeCRDT migration](persistence/saving-progress-has-no-writer.md)
- [Why the thoughtspace is one CRDT tree, not per-parent subdocuments](persistence/why-one-crdt-tree-not-subdocuments.md)

### `layout/` — Positioning, sizing, and animation

- [Dialog scroll lock belongs in CSS, not an un-counted global](layout/dialog-scroll-lock-ios.md)
- [em → rem is not a pure refactor under a non-root font size](layout/em-to-rem-nested-font-size.md)
- [Every keystroke re-rendered every thought: reference identity in the LayoutTree path](layout/layout-tree-prop-identity-rerenders.md)
- [The Mobile Safari navigation flash is a browser limit, not a timing bug](layout/mobile-safari-navigation-flash.md)
- [Thought spacing is padding-based: never reintroduce a multiline flag](layout/no-multiline-flag-thought-spacing.md)
- [Layout is measured from enumerated dependencies, never a ResizeObserver](layout/no-resize-observers-for-layout.md)
- [The position: fixed fallback must stay Mobile-Safari-only](layout/position-fixed-fallback-mobile-safari-only.md)

### `drag-and-drop/` — Drag sources, drop targets, and the long-press state machine

- [The hover guards are what stop the shake detector cancelling drags](drag-and-drop/hover-guards-prevent-drag-cancel.md)
- [Registering a second react-dnd backend strips the draggable attribute iOS Safari needs](drag-and-drop/single-backend-and-draggable-attribute.md)
- [The bullet and the editable need two separate useDrag hooks](drag-and-drop/two-drag-sources-bullet-and-editable.md)

### `commands/` — Commands, keyboard, and gestures

- [The 25/65 gesture bias is deliberately absent from GestureDiagram](commands/gesture-bias-not-in-diagram.md)
- [MultiGesture's react-native-web integration cannot be inlined or defaulted](commands/panresponder-integration-is-load-bearing.md)

### `styling/` — Panda CSS, theming, and typography

- [When a blur, a blend, or a z-index silently does nothing](styling/compositing-traps-blur-blend-stacking.md)
- [A Panda css() class cannot override an unlayered vendor stylesheet](styling/panda-cannot-override-vendor-css.md)
- [A Panda class with no rule: stale extraction and unreadable variants](styling/panda-class-with-no-rule.md)

### `testing/` — Unit, store, and end-to-end tests

- [Animation durations live in JS so both zeroing paths can reach them](testing/animation-durations-single-source.md)
- [Measuring a layout shift when test timing has collapsed the animation](testing/measuring-layout-shift-with-animations-zeroed.md)
- [Middleware and enhancer closure state survives initStore](testing/middleware-state-survives-initstore.md)
- [Never add a stacking-context property to the snapshot stylesheet](testing/puppeteer-snapshot-layer-promotion.md)

### `build/` — Build, bundling, and the native shells

- [Only listed extensions are precached, and a CSS url() asset is invisible otherwise](build/pwa-precache-extension-allowlist.md)
- [A blank Tauri window is the dev server's self-signed certificate](build/tauri-blank-window-self-signed-cert.md)
<!-- index:end -->

## Writing one

Frontmatter first, then a fixed section order. Two shapes, chosen by what the doc is.

**A bug** — something broke, was diagnosed, and was fixed:

```yaml
---
title: Clear problem title
date: YYYY-MM-DD
category: <subdirectory>
module: <area of the app>
problem_type: ui_bug | runtime_error | test_failure | performance_issue | build_error | logic_error | integration_issue | database_issue | security_issue
component: <frontend | testing_framework | database | tooling | …>
symptoms:
  - Observable symptom
root_cause: <async_timing | wrong_api | test_isolation | config_error | …>
resolution_type: code_fix | test_fix | config_change | workflow_improvement | …
severity: critical | high | medium | low
tags: [keyword-one, keyword-two]
---
```

Sections: `Problem`, `Symptoms`, `What Didn't Work`, `Solution`, `Why This Works`, `Prevention`, `Related`.

**A practice** — a convention, pattern, or decision worth keeping:

```yaml
---
title: Clear, descriptive title
date: YYYY-MM-DD
category: <subdirectory>
module: <area of the app>
problem_type: best_practice | convention | architecture_pattern | design_pattern | tooling_decision | workflow_issue | developer_experience | documentation_gap
component: <…>
severity: critical | high | medium | low
applies_when:
  - Condition where this applies
tags: [keyword-one, keyword-two]
---
```

Sections: `Context`, `Guidance`, `Why This Matters`, `When to Apply`, `Examples`, `Related`.

Conventions the files follow:

- **`What Didn't Work` is the load-bearing section.** It is the part the final diff cannot record, and usually the reason the doc exists. Leave it out only when the thread genuinely shows no failed approach.
- **Name things exactly.** Files, functions, ordering, platform. "Caret handling on iOS is tricky" is not a learning; a named handler, a named event, and the reason the obvious check fails is.
- **Link to source.** The issues and pull requests the learning came from, as bare `#1234` autolinks, under `Related`.
- **Link into `docs/`** for every mechanism the reader needs and this file does not own.
- **Present tense for the mechanism, past tense for the incident.**

The [`ce-compound`](https://github.com/EveryInc/compound-engineering-plugin) skill writes these, and its schema is the source of truth for the frontmatter vocabulary. Writing one by hand is fine; the shape above is the whole contract.

## Status

This directory is being backfilled from the project's history. [`migration-log.md`](migration-log.md) records which window has been swept, what was mined from it, and what is left — read it before starting another pass so the same threads are not re-read.
