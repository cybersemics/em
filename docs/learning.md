# Learning Journey

The learning journey helps early users learn commands gradually through normal use. The full design is tracked in [#5481](https://github.com/cybersemics/em/issues/5481). This document describes what exists in the code today: a pinned command shown in a persistent corner widget, surrounded by a practice-progress ring.

## State

`state.learning` ([`LearningState`](../src/@types/LearningState.ts)) holds two independent facts:

```ts
{
  pinnedCommandId: CommandId | null
  progress: Partial<Record<CommandId, { reps: number; targetReps: number }>>
}
```

- Progress is keyed by stable `CommandId`, never by label, category, or position, so relabeling or regrouping a command preserves its record.
- A missing record means the command is unstarted. A record is created when a command is first pinned, capturing the target from `LEARNING_TARGET_REPS` in [`constants.ts`](../src/constants.ts). Changing that constant does not change existing records.
- Completion is derived: `reps >= targetReps`. There is no separate learned flag or journey status.

The state is held in memory only. There is no persistence boundary yet, so the pin and any progress are lost on reload. When storage is added it belongs behind a dedicated learning persistence module, not in the reducers or components.

## Actions

- [`pinCommand`](../src/actions/pinCommand.ts) — selects the command and initializes its progress record if absent. Repinning reuses the existing record.
- [`unpinCommand`](../src/actions/unpinCommand.ts) — clears the selection and retains every progress record.

Both are registered `undoable: false`, and `learning` is listed in `statePropertiesToOmit` in [`undoRedoEnhancer`](../src/redux-enhancers/undoRedoEnhancer.ts), so pinning neither adds an undo step nor is reverted by undoing an edit. Nothing records reps yet; awarding verified reps is [#5484](https://github.com/cybersemics/em/issues/5484) and [#5485](https://github.com/cybersemics/em/issues/5485).

## Pinning from the Command Universe

Every command's detail page ([`CommandUniverseDetailPage`](../src/components/CommandUniverse/CommandUniverseDetailPage.tsx)) has a Pin Command row under the header. It reads Unpin Command when that command is the pinned one, and its description names the command that pinning would replace. Pressing it never executes the command.

## The corner widget

[`PinnedCommand`](../src/components/Learning/PinnedCommand.tsx) is mounted in `AppComponent` beside the NavBar and renders nothing while no command is pinned. It is `position: fixed` in the bottom-right corner, aligned with the NavBar row using the same `safeAreaBottom` expression, on the `pinnedCommand` z-index layer just above `navbar`. It is display-only in this version: `pointer-events: none` lets taps and gestures in the corner reach the content beneath, so the gesture zone and scroll zone are unaffected. It exposes `role="img"` with the label `Pinned command: <label>`.

While a command is pinned, the NavBar's inner row and the Footer leave `PINNED_COMMAND_RESERVED_WIDTH` free on the right so breadcrumbs, buttons, and footer links do not run under the ring. The NavBar's full-width blackout is untouched, so no gap opens behind the bottom chrome.

## The ring

[`PinnedCommandRing`](../src/components/Learning/PinnedCommandRing.tsx) draws a 73×73 box from the Figma export values:

- **Track**: a stroked SVG circle with the export's linear gradient, layer blur, drop shadow, 52% opacity, and `mix-blend-mode: hard-light`. Copied verbatim.
- **Fill**: in Figma the arc is an annular sector with an along-arc gradient and an *angular progressive layer blur* (tail 14 → head 4, Figma units; a Figma blur value is 2σ). No browser has an angular blur, so the arc is one `conic-gradient` (color and progress angle together) masked to the annulus, stacked five times; each copy is masked to an angular band that crossfades into its neighbours and is wrapped in a div with a different `filter: blur()`. The blur sits on the wrapper so it applies after the inner masks and softens the ring edges. This was chosen over splitting the arc into individually blurred SVG segments because it composites on the GPU and animates by changing one angle.
- **Color**: mono while practicing; when `complete` is true the colorful stack fades in over `durations.pinnedCommandComplete`. Completion is passed in by the caller, derived from progress, and never stored.

[`TestPinnedCommandRing`](../src/components/modals/TestPinnedCommandRing.tsx) renders the ring at 0%, 30%, the export's 63.5%, 90%, 100% mono, and completed colorful for the [`pinned-command-ring`](../src/e2e/puppeteer/__tests__/pinned-command-ring.ts) snapshot. The screenshot helper disables CSS filters, so the snapshot guards geometry and gradients, not the blur.

## Not yet built

Verified execution outcomes, rep counting, the gesture tooltip, the learning overview, next-command suggestions, and persistence are separate child issues of #5481. Tapping the widget does nothing in this version.
