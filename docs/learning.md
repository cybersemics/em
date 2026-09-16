# Learning Journey

The learning journey helps early users learn commands gradually through normal use. The full design is tracked in [#5481](https://github.com/cybersemics/em/issues/5481). A pinned command stays in a corner widget with a practice-progress ring; opening the ring reveals its gesture and a link to its Command Universe detail page.

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

[`learningStorage`](../src/data-providers/learningStorage.ts) saves the pin and progress in versioned device-local storage. Initialization loads it before the app renders and discards records for commands that no longer exist. Pinning, unpinning, and awarding a rep save the new learning state. Learning is independent of the active thoughtspace; it does not sync to other devices.

## Actions

- [`pinCommand`](../src/actions/pinCommand.ts) — selects the command and initializes its progress record if absent. Repinning reuses the existing record.
- [`unpinCommand`](../src/actions/unpinCommand.ts) — clears the selection and retains every progress record.
- [`commandSucceeded`](../src/actions/commandSucceeded.ts) — receives a command-level success report and awards one rep when the invoked command is pinned and the invocation came from an actual keyboard shortcut or gesture. Reps stop at the record's target.

These actions are registered `undoable: false`, and `learning` is listed in `statePropertiesToOmit` in [`undoRedoEnhancer`](../src/redux-enhancers/undoRedoEnhancer.ts), so pinning and practice never add an undo step or get reverted by undoing an edit.

The command runner reports success once per top-level invocation, including a multicursor invocation. It does so when `exec` returns normally or its returned promise resolves, provided the command was executable, did not set a new app error, and did not return `false` for cancellation. A thrown or rejected error prevents a success report. AI commands return their request promises through the first-use disclosure; canceling the disclosure earns nothing. This tests the command's execution boundary; work that a command starts without returning its promise cannot be judged after it finishes. Toolbar, Command Center, Command Universe, and internal calls do not earn practice credit.

## Pinning from the Command Universe

Every command's detail page ([`CommandUniverseDetailPage`](../src/components/CommandUniverse/CommandUniverseDetailPage.tsx)) has a Pin Command row under the header. It reads Unpin Command when that command is the pinned one, and its description names the command that pinning would replace. Pressing it never executes the command.

## The corner widget

[`PinnedCommand`](../src/components/Learning/PinnedCommand.tsx) is mounted in `AppComponent` beside the NavBar and renders nothing while no command is pinned. It is `position: fixed` in the bottom-right corner, aligned with the NavBar row using the same `safeAreaBottom` expression, on the `pinnedCommand` z-index layer just above `navbar`. Opening the gesture overlay raises the ring to `pinnedCommandExpanded`, above the `notification` surface but below popups and dialogs, and scales it to 1.5× from the bottom-right corner over the same medium ease-out timing as the surface's entrance. The ring stays raised until its scale-down transition finishes, including when Escape starts the overlay's exit fade. While raised, it passes pointer events through to the overlay so its Clear control remains usable. When closed, only the ring button accepts pointer events, leaving the surrounding corner open to gestures and taps. The button is named `Show gesture for <label>`, describes the current rep count and captured target, and reports whether its tooltip is expanded.

While a command is pinned, the NavBar's inner row and the Footer leave `PINNED_COMMAND_RESERVED_WIDTH` free on the right so breadcrumbs, buttons, and footer links do not run under the ring. The NavBar's full-width blackout is untouched, so no gap opens behind the bottom chrome.

## The ring

[`PinnedCommandRing`](../src/components/Learning/PinnedCommandRing.tsx) draws a 73×73 box from the Figma export values:

- **Track**: a stroked SVG circle with the export's linear gradient, layer blur, drop shadow, 52% opacity, and `mix-blend-mode: hard-light`. Copied verbatim.
- **Fill**: in Figma the arc is an annular sector with an along-arc gradient and an *angular progressive layer blur* (tail 14 → head 4, Figma units; a Figma blur value is 2σ). No browser has an angular blur, so the arc is one `conic-gradient` (color and progress angle together) masked to the annulus, stacked five times; each copy is masked to an angular band that crossfades into its neighbours and is wrapped in a div with a different `filter: blur()`. The blur sits on the wrapper so it applies after the inner masks and softens the ring edges. This was chosen over splitting the arc into individually blurred SVG segments because it composites on the GPU and animates by changing one angle.
- **Color**: mono while practicing; the colorful stack fades in over `durations.pinnedCommandComplete` only when the currently pinned command crosses its target locally. Completed progress loaded from storage or shown after repinning renders colorful immediately. Reduced-motion preference skips the fade. Completion is derived from progress and never stored separately.

[`TestPinnedCommandRing`](../src/components/modals/TestPinnedCommandRing.tsx) renders the ring at 0%, 30%, the export's 63.5%, 90%, 100% mono, and completed colorful for the [`pinned-command-ring`](../src/e2e/puppeteer/__tests__/pinned-command-ring.ts) snapshot. The screenshot helper disables CSS filters, so the snapshot guards geometry and gradients, not the blur.

## Gesture tooltip

[`PinnedCommandTooltip`](../src/components/Learning/PinnedCommandTooltip.tsx) uses the shared [`NotificationSurface`](../src/components/Notifications/NotificationSurface.tsx) with the same rainbow glow, TIP label, message treatment, and Clear control as [`Tip`](../src/components/Notifications/Tip.tsx). The message shows the pinned command's canonical gesture from the command registry at Tip's inline diagram size, or explains that no gesture is assigned. The command name opens that command's detail page directly, so a previous Command Universe search cannot hide it. Opening and dismissing the tooltip does not execute the command, change the pin, or award practice reps. Clear, an outside tap, a successful swipe, and Escape dismiss it.

The ring records the editor's selection offsets before pointer activation can move focus. When the command-name button opens the Command Universe, its open action preserves that snapshot rather than replacing it with the selection inside the tooltip. This lets commands that act on selected text continue to use the editor range.

## Not yet built

The learning overview, next-command suggestions, and completion animation are separate child issues of #5481.
