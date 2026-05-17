# Folder Structure

The main directory structure is organized as follows. Tests are located in a subdirectory named `__tests__` in each directory.

## Top-level directories under `src/`

- [`/src/@types`](../src/@types) — Shared TypeScript type definitions and ambient declarations. The canonical shapes (`Thought`, `Path`, `Lexeme`, `Command`, `State`, etc.) live here.
- [`/src/actions`](../src/actions) — Redux reducers and action-creators are co-located. Prefer reducers when possible, as they are pure functions that are more easily testable and composable. Only define an action creator if it requires a side effect. Use [`util/reducerFlow`](../src/util/reducerFlow.ts) to compose reducers.
- [`/src/commands`](../src/commands) — Keyboard, gesture, and toolbar commands (formerly `shortcuts`). One file per command, plus an `index.ts` barrel. See [commands.md](commands.md) for the architecture.
- [`/src/components`](../src/components) — React components.
- [`/src/data-providers`](../src/data-providers) — Storage and sync backends implementing the [`DataProvider`](../src/data-providers/DataProvider.ts) interface. The live implementation is YJS in [`yjs/thoughtspace.ts`](../src/data-providers/yjs/thoughtspace.ts). See [persistence.md](persistence.md).
- [`/src/device`](../src/device) — Device/DOM-level helpers for selection, scrolling, clipboard, focus, and platform detection. The selection wrapper [`device/selection.ts`](../src/device/selection.ts) is the single point of access to `window.getSelection()` (enforced by lint). See [cursor-and-caret.md](cursor-and-caret.md).
- [`/src/e2e`](../src/e2e) — End-to-end test setup, including Puppeteer and iOS environments. See [testing.md](testing.md).
- [`/src/hooks`](../src/hooks) — React hooks.
- [`/src/recipes`](../src/recipes) — Panda CSS recipes that define styled component variants. New components should use these or inline styles.
- [`/src/redux-enhancers`](../src/redux-enhancers) — Redux enhancers (e.g. the [`pushQueue`](../src/redux-enhancers/pushQueue.ts) that flushes state mutations to YJS).
- [`/src/redux-middleware`](../src/redux-middleware) — Redux middleware (e.g. the [`pullQueue`](../src/redux-middleware/pullQueue.ts) that loads thoughts on demand, or [`clearSelection`](../src/redux-middleware/clearSelection.ts) that clears the browser caret on cursor changes).
- [`/src/selectors`](../src/selectors) — Pure functions that compute (and often memoize) slices from the Redux state. See [data-model.md](data-model.md) for the canonical traversal selectors.
- [`/src/stores`](../src/stores) — Lightweight non-Redux ministores for ephemeral UI state. Examples: [`editingValue`](../src/stores/editingValue.ts) (the in-progress thought text), [`viewport`](../src/stores/viewport.ts), [`scrollTop`](../src/stores/scrollTop.ts), [`gesture`](../src/stores/gesture.ts), [`syncStatus`](../src/stores/syncStatus.ts), [`selectionRangeStore`](../src/stores/selectionRangeStore.ts).
- [`/src/test-helpers`](../src/test-helpers) — Helpers used in unit, store, and JSDOM tests. See [testing.md](testing.md).
- [`/src/util`](../src/util) — Pure utility functions. No React, no Redux access.

## Load-bearing top-level files

- [`/src/index.tsx`](../src/index.tsx) — App entry point: mounts `<App />` into the DOM.
- [`/src/initialize.ts`](../src/initialize.ts) — Bootstraps the thoughtspace, the offline-status store, the cursor from URL, and global event handlers. Called by `index.tsx`.
- [`/src/commands.ts`](../src/commands.ts) — Builds the `globalCommands` array, three lookup indices (by id, keyboard, gesture), and the global `keyDown` / `keyUp` / gesture handlers. See [commands.md](commands.md).
- [`/src/constants.ts`](../src/constants.ts) — App-wide constants (root tokens, timeouts, schema version, settings enum, `LongPressState`, `COMMAND_GROUPS`, etc.). For constants used in only one module, define them locally; promote here when shared.
- [`/src/browser.ts`](../src/browser.ts) — Platform detection (`isTouch`, `isSafari`, `isMac`, `isMobile`).
- [`/src/globals.ts`](../src/globals.ts) — A small set of mutable globals that need to live outside Redux for performance (e.g. `suppressExpansion`).
- [`/src/colors.config.ts`](../src/colors.config.ts), [`/src/durations.config.ts`](../src/durations.config.ts) — Design-token configuration consumed by Panda CSS.
- [`/src/service-worker.ts`](../src/service-worker.ts), [`/src/serviceWorkerRegistration.ts`](../src/serviceWorkerRegistration.ts) — PWA service worker setup.

## Where to find...

| Concept | Location |
|---|---|
| Redux state shape | [`@types/State.ts`](../src/@types/State.ts) |
| Thought / Path / Lexeme types | [`@types/`](../src/@types) |
| State mutation (reducer or thunk) | [`actions/`](../src/actions) |
| Pure read from state | [`selectors/`](../src/selectors) |
| Non-Redux UI state | [`stores/`](../src/stores) |
| Browser DOM / selection / scroll APIs | [`device/`](../src/device) |
| User-triggered command | [`commands/`](../src/commands) |
| Yjs persistence engine | [`data-providers/yjs/thoughtspace.ts`](../src/data-providers/yjs/thoughtspace.ts) |
| Layout positioning math | [`hooks/usePositionedThoughts.ts`](../src/hooks/usePositionedThoughts.ts) |
| Visible-thoughts traversal | [`selectors/linearizeTree.ts`](../src/selectors/linearizeTree.ts) |
| Pure helper (no React, no Redux) | [`util/`](../src/util) |

## Conventions

- **Pure where possible.** `selectors/` and `util/` should be pure functions; `actions/` is where side effects live.
- **One concern per directory.** A file that both reads state and dispatches probably belongs in `actions/`, not `selectors/`. A util that imports React belongs in `hooks/` or `components/`, not `util/`.
- **Tests next to source.** Tests live in `__tests__/` subdirectories, not in a separate `tests/` tree.
- **Browser API access is gated.** `window.getSelection`, `localStorage`, viewport reads — all go through `device/` or `stores/` wrappers, not direct calls in feature code.
