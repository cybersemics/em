# Command Help & Replay

**Status: proposal.** Nothing described here is implemented. This document records the design and the decisions behind it so that the work can be split into issues. It is not a description of how em works today; do not plan against it as though it were.

## Problem

Every command should have a help page: a terse description, representative examples, a sense of *where* you would reach for it, and a demonstration of what it actually does to the tree — enough that a user can start imagining using it.

### What exists today

Per-command help in the app is **one table row**. `Help.tsx` → [`CommandTable`](../../src/components/CommandTable.tsx) → [`CommandTableItem`](../../src/components/CommandTableItem.tsx)/[`CommandItem`](../../src/components/CommandItem.tsx) renders an icon, a label, a one-line description, and either a keyboard shortcut or a `GestureDiagram`. The same `CommandItem` is reused in the Desktop Command Universe, Gesture Menu, mobile Command Universe, and Help. **There is no detail view anywhere in the app** — no route, no panel, no "more".

The [Tutorial](../../src/components/Tutorial) is the only thing that teaches by doing, and it is ~30 hand-written step components driving the user's real thoughtspace with instructions overlaid. It does not generalize to 90 commands.

### The buried asset

[`docs/commands.md`](../commands.md) already contains **88 per-command Reference entries** with substantive prose and **37 recorded screencasts** hosted as GitHub attachments. That is close to the help content we want — hand-maintained, in a markdown file users never see.

So this is less "write help for 90 commands" than **"make that content structured, generated, and shipped."** The existing prose is the seed corpus for the generation layer, not something to discard.

### What is already machine-readable

The [`Command`](../../src/@types/Command.ts) interface carries more than the help UI uses. Of 90 commands: 86 have a `description`, 66 a `keyboard`, 41 a `gesture`, 83 an `svg`. Plus `labelInverse`/`descriptionInverse`, `canExecute`, `isActive`, `multicursor` (required, and often documents real semantics), and the `hideFrom*` flags. The factual half of a help page — name, one-liner, shortcut, gesture diagram, icon, which surfaces it appears on, when it is disabled, what a multiselect does — needs no new authoring.

## Decisions

| | Decision |
|---|---|
| **Surface** | In-app detail page, reachable from Help and the Command Universe |
| **Motion** | Run the real command against a sandbox store and render through the real `LayoutTree`. Computed live at view time, not recorded |
| **Caret** | Not modelled. A replay has no editor and nobody types into it |
| **Scenario** | Seed outline + single command, with an optional untimed prelude for history-dependent commands |
| **Loop** | Hard cut with a brief fade |
| **Tests** | Run against the actual scenario — not a copy — asserting exported outline *and* linearized tree shape |
| **Prose** | LLM-generated, checked in, with a staleness hash over command source + description |
| **Platform** | Adapt to the viewing device (gesture on touch, keystroke on desktop) |
| **Layout component** | One `LayoutTree`, parameterized. No forked component tree |
| **Injection** | Props, defaulting to the module singletons. Not React context |
| **Sequencing** | Viewport/scroll decoupling lands ahead of the autocrop rewrite |

## Why live execution, not recording

em's layout is a **flat list of absolutely-positioned siblings** ([layout-rendering.md](../layout-rendering.md)). The visual hierarchy is x/y math, not DOM nesting, and that decoupling is what lets a thought move smoothly between *any* two states — across depth, across parents, across a context-view boundary — without re-parenting mid-animation. The motion is CSS transitions on `left`/`top` in [`TreeNodePositioner`](../../src/components/TreeNodePositioner.tsx), at `durations.layoutNodeAnimation`, with distinct easings for swap, sort, and context-view-disappearing cases.

So there is no animation to capture. Put the engine in state A, put it in state B, and the tween happens.

This has three consequences that decide the design:

1. **A demo is a sequence of states, not a sequence of frames.** Nothing needs to script intermediate positions.
2. **Recording throws away the thing that explains the command.** A video freezes one resolution, one theme, one font size — in an app with `fontSizeUp`/`fontSizeDown` and light/dark themes. And y-positions come from the two-pass measurement render, so any pre-baked artifact is positioned for the viewport it was baked at.
3. **Nothing needs regenerating.** The motion is computed from the real reducer and the real layout engine at view time. Change `indent.ts` and its demo changes. No cache key, no re-record job, no 90–360 binary assets. The only thing that can go stale is the prose.

Before/after outline pairs were considered and rejected as the primary representation: they are a developer artifact (a start state, an end state, explicit steps), and for a single-step command the interesting thing is the *change to the tree*, which is motion.

### What the sandbox store is

`createStore(appReducer, …)` without the persistence enhancers, seeded with `importText`, then `executeCommand(command, { store: demoStore })`. Command execution is already store-injectable — [`src/commands.ts`](../../src/commands.ts) takes an explicit `store`, which is how the command tests run today.

## Architecture

### The render path is already store-agnostic

`LayoutTree`, `TreeNode`, `TreeNodePositioner`, `VirtualThought`, `Thought`, `StaticThought`, `ThoughtAnnotation`, `ThoughtPositioner`, `Bullet`, and `Editable` import the singleton store **zero** times; `Subthought` and `Note` once each. They read through `useSelector`. The singleton coupling (~140 direct `getState`/`dispatch` sites, 38 in components) lives in commands, actions, middleware, and non-render components.

What makes `LayoutTree` hard to embed is not Redux. It is the **window**: it assumes it is the only tree on the page and that it owns the page's scroll.

| Site | Coupling |
|---|---|
| `useAutocrop` | `window.scrollY`, `window.scrollTo` — counter-scrolls the page |
| `useNavAndFooterHeight` | `document.querySelector('[aria-label="nav"\|"footer"]')` |
| `useLayoutTreeTop` | writes global `viewportStore.layoutTreeTop` |
| `LayoutTree`, `usePositionedThoughts`, `VirtualThought` | `viewportStore` — sizes to the browser, not a container |
| `TreeNode` | `scrollTopStore` virtualization against page scroll |

### Two seams, opposite reactivity

- **Viewport** — a `Ministore` instance. Subscribed with the narrowest derived selector, boolean wherever a boolean will do (already the codebase's own pattern in `TreeNode`, which selects *whether* a thought is past the virtualization boundary so most scroll ticks re-render nothing).
- **Scroll ownership** — a plain imperative handle (`getScrollY()`, `scrollTo()`), never subscribed.

`scrollY` must stay imperative, and not for performance reasons. In `useAutocrop` it never reaches the return value (`-spaceAboveExtended + viewportHeight`); it is a latched sample of *where the page was before this render*, consumed only inside an effect that deliberately excludes it from its deps. Subscribing would change its meaning to "scroll position at the last notification" — a correctness change — and would re-render the tree at 60fps for the duration of every scroll.

`scrollTopStore` cannot serve as that handle either: it is throttled to 16.66ms, so `getState()` can be a frame stale, and a stale sample yields a wrong compensation delta and a visible shift.

### Injection is by props, not context

`createContext` appears in exactly one file in the codebase (`Export.tsx`); it is not a pattern here. A ministore cannot substitute, because it is module-level and cannot scope to a subtree when the app's tree and a demo tree are both mounted. But nothing requires resolution-by-lookup — pass the instances:

```ts
const windowContainer = { viewport: viewportStore, scrollTop: scrollTopStore, scroll: windowScroll, root: document }

const LayoutTree = ({ container = windowContainer }) => …
```

The app renders `<LayoutTree />` and the default resolves to today's singletons. A demo renders `<LayoutTree container={demoContainer} />`.

One bundled object rather than four props keeps the drill to a single prop and gives one referential-stability guarantee instead of four. Drill depth is two hops: `LayoutTree` → `TreeNode` → `VirtualThought`. `usePositionedThoughts` needs none — it already takes an options object. `useAutocrop` and `useNavAndFooterHeight` are local to `LayoutTree.tsx` and take a plain argument.

The demo's container falls out for free: its viewport store reports the container's box, its scroll handle is a no-op (which is what freezes autocrop), its scrollTop store never updates so virtualization never flips, and `root` scoped to the demo's own div finds no nav or footer and settles at 0/0 on the first effect (both reads are already null-safe).

### Render neutrality by construction

This refactor must be provably render-neutral from the diff. **No profiling is in scope for this feature.** One rule gets there:

> Change *where* a value comes from, never *how* a component learns that it changed.

`Ministore` exposes both `getState()` and `useSelector()`, so every current window read has a matching non-reactive form on an injected instance. Injection never implies subscription.

| Site | Today | After |
|---|---|---|
| `useAutocrop` | `window.scrollY` | `container.scroll.getScrollY()` |
| `useAutocrop` | `window.scrollTo(…)` | `container.scroll.scrollTo(…)` |
| `LayoutTree` (maxWidth) | `window.innerWidth` | `container.viewport.getState().innerWidth` — **not** `useSelector` |
| `useNavAndFooterHeight` | `document.querySelector` | same query, scoped to `container.root` |
| `LayoutTree`, `usePositionedThoughts`, `VirtualThought` | `viewportStore.useSelector(…)` | same call, injected instance |
| `TreeNode` | `scrollTopStore.useSelector(…)` | same call, injected instance |
| `useLayoutTreeTop` | `viewportStore.update(…)` | same call, injected instance |

Nothing there adds, removes, or re-grains a subscription, and in the app every instance resolves to today's singleton, so the values are identical too. The diff is pure indirection.

**The five checks**, all greppable from the diff and enforceable in review:

1. No new `useSelector` / `useSyncExternalStore` / `useState` / `useEffect` in the render path.
2. No hook dependency array gains or loses an entry.
3. No `useMemo` / `useCallback` dep list changes — so no memo's invalidation frequency changes.
4. Any new shared reference is referentially stable (module-level, or `useMemo(…, [])`).
5. No prop's referential stability changes — no new object, array, or function literal passed down.

The added `container` prop satisfies 5: it is a frozen module-level reference in the app path, so `VirtualThoughtMemo`'s comparator — which iterates `for (const key in prevProps)` and compares by `!==` — picks it up automatically and never invalidates on it.

#### Supporting facts

- The memo boundary is **lower than it looks**. `TreeNode` and `TreeNodePositioner` are plain function components; the only memo boundaries are `VirtualThoughtMemo` and `ThoughtComponentMemo`. Any `LayoutTree` re-render reconciles all N children unconditionally, and stops at `VirtualThought` only because every object-valued prop is already kept stable on purpose (`cliffPaddingStyle` is `useMemo`'d, `onResize` is `useCallback`'d, `env` is passed through by reference — see the comment in [`linearizeTree`](../../src/selectors/linearizeTree.ts)).
- An extra render does **not** re-run `linearizeTree`. react-redux 9 goes through `useSyncExternalStoreWithSelector`, which caches the selection against the snapshot reference; unchanged Redux state means the selector and its lodash `isEqual` do not run again.

#### Explicitly out of scope

- **The `innerWidth` staleness bug** (below). Fixing it means adding a subscription, which breaks check 1. Under `getState()` the existing behavior is preserved exactly — which is the point.
- **`React.memo` on `TreeNode`.** It would likely make spurious `LayoutTree` renders close to free, but it changes render behavior and would need measurement to justify. It is also no longer needed as de-risking, since the refactor is neutral by construction rather than neutral-on-balance.

Both should be filed separately.

## The scenario contract

The one thing that cannot be derived is **what thoughtspace makes a command legible**. Letter Case needs mixed case; Bind Context needs two contexts of one thought; Cursor Forward (Table) needs a table view. Generic fixtures produce meaningless demos, and that — not rendering, not prose — is the failure mode most likely to sink an automatic system.

So the scenario is the authored unit, and it is small: a seed outline, a cursor, optionally a selection, and the command. Everything downstream generates from it.

- **Prelude.** An optional list of setup actions that runs before the replay begins and is not shown. This is what makes `repeat`, `undo`, `redo`, `jumpBack`, `jumpForward`, and `navigateBack` demoable at all, while keeping the common case a plain seed.
- **Validation.** A scenario whose command is a no-op is a broken scenario, and that is a check CI can enforce.
- **Relationship to tests.** A scenario is structurally what the command tests already are: `importText` → `setCursor` → execute → `exportContext`. 67 of 90 commands have one, and they are the obvious starting point — though they are written for edge cases, not for legibility, so they inform scenarios rather than becoming them.

## The test contract

Tests run **against the actual scenario**, not a parallel copy of it, so that a selector regression fails even when the command itself did not change. Each scenario asserts two things:

1. **`exportContext` output** — the data change, exactly like the existing command tests.
2. **Linearized tree shape** — order, depth, keys, table and autofocus flags, from `linearizeTree`.

Coordinates from `usePositionedThoughts` are deliberately **not** asserted: any change to font size, cliff padding, or table width math would churn every scenario's expectations for no correctness gain.

## The prose layer

LLM-generated at build, **checked in**, never generated at runtime or on install. Reviewable in a PR diff, no API key or network in the build, deterministic releases, and a human can override a bad paragraph without fighting the generator.

Grounded in the command source, the executed scenario, and the existing `docs/commands.md` prose. Staleness is tracked by a hash over the command source and description, so CI can report *"`pin.ts` changed, its help prose is stale"* without blocking the build or making it nondeterministic.

## Coverage notes

- **Gestures** are half the commands' identity (41 of 90) and do not appear in a desktop capture. The demo adapts to the viewing device, matching how `CommandItem` already switches between keyboard shortcut and `GestureDiagram`. The synchronized input overlay — the gesture being traced, or the keystroke — is a separate component from the tree replay.
- **Creates and deletes fade rather than tween.** `TransitionGroup` handles mount/unmount (`nodeFadeIn`, `nodeFadeOut`, `nodeDissolve`). This is correct, but it means a New Thought demo reads structurally differently from a Move Thought demo, and scenario design should account for it.
- **The two-pass render must settle before playing.** `usePositionedThoughts` consumes `sizes` from `useSizeTracking`, populated by `VirtualThought` measuring real DOM. Mount the demo at rest in the seed state and let measurement settle before the transition, so a lazily-mounted demo never shows the estimate-to-measured convergence.

## Work breakdown

**Track A — LayoutTree parameterization.** Introduce the two seams and the `container` bundle; swap the ~7 call sites to resolve through them; change nothing else. Governed by the five checks. Lands ahead of the autocrop rewrite so the rewrite inherits an explicit scroll owner instead of reaching for `window`.

**Track B — Sandbox store + replay component.** The demo store factory, the scenario format, the player (seed → hold → execute → hold → cut/fade → repeat), and the input overlay.

**Track C — Scenarios.** One per command, authored, validated in CI.

**Track D — Tests.** The two assertions per scenario, run against the real scenario objects.

**Track E — Prose generation.** The generator, the staleness hash, the checked-in output, seeded from `docs/commands.md`.

**Track F — The detail page.** The in-app surface, reachable from Help and the Command Universe, assembling facts + prose + replay.

A depends on nothing. B depends on A. C, D, E are independent of A and can proceed in parallel. F depends on B and E.

## Related: store injectability

Independent of this feature, and worth doing on its own merits: `App.tsx` hardcodes `<Provider store={store}>`, ~140 sites call the singleton's `getState`/`dispatch` directly (38 in components), and the ministores are module-level singletons. Stores that are always injectable — or that never reference a global — would be cleaner, better separated, and more testable.

Only a small part of this actually unblocks the replay (command execution is already store-injectable, and the render path is already store-agnostic), so the two efforts should be scoped separately rather than bundled. It can proceed incrementally, ahead of or alongside the replay work.

## Bugs found while designing this

- **`window.innerWidth` staleness.** It is read *inside* the `treeThoughtsMemoized` `useMemo`, which is keyed on `[indent, treeThoughtsPositioned]` and does not list it. A horizontal-only resize changes neither dep, and does not change `innerHeight` either, so the `viewportStore` subscription in the same component does not fire — leaving `maxWidth` stale until something unrelated invalidates the memo. The fix is a boolean selector (`innerWidth > 560`) added to the deps, which recomputes only on breakpoint crossing.
- **Stale comment** in [`linearizeTree`](../../src/selectors/linearizeTree.ts): it says a new `env` reference would "defeat the memoization of TreeNode and its descendants," but `TreeNode` is not memoized. The protection is one level down, at `VirtualThought`.

## Open questions

- **The AI commands.** `generateThought`, `defineTerm`, `organizeThought`, and `generateEmoji` call a network service and cannot run live in a help page. Stub a canned response, or exclude them from the replay layer and give them facts + prose only?
- **The detail page's shape.** Route, modal panel, or expand-in-place from the command row — undecided.
- **Is the input overlay in v1?** The tree replay is useful without the synchronized gesture/keystroke overlay; the overlay is what makes it a *command* demo rather than a *behavior* demo.
- **Naming.** `container` is a placeholder for the injected bundle.
