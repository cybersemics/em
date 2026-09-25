# Folder Structure

The main directory structure is organized as follows. Tests are located in a subdirectory named `__tests__` in each directory.

## Top-level directories under `src/`

- [`/src/@types`](../src/@types) — Shared TypeScript type definitions and ambient declarations. The canonical shapes (`Thought`, `Path`, `Lexeme`, `Command`, `State`, etc.) live here.
- [`/src/actions`](../src/actions) — UI reducers, document commands and action-creators are co-located. UI reducers are pure. Document commands receive an explicit `ThoughtspaceTransaction`, execute outside Redux's reducer and read canonical document state after each update. [`util/reducerFlow`](../src/util/reducerFlow.ts) composes both and forwards the transaction to document commands.
- [`/src/commands`](../src/commands) — Keyboard, gesture, and toolbar commands (formerly `shortcuts`). One file per command, plus an `index.ts` barrel. See [commands.md](commands.md) for the architecture.
- [`/src/components`](../src/components) — React components.
- [`/src/data-providers`](../src/data-providers) — Storage and sync integration. The active prototype joins memory and persistent TreeCRDT peers in [`createMemoryThoughtspace.ts`](../src/data-providers/treecrdt/createMemoryThoughtspace.ts), which owns synchronous document reads, transactions, and storage lifecycle. See [persistence.md](persistence.md).
- [`/src/device`](../src/device) — Device/DOM-level helpers for selection, scrolling, clipboard, focus, and platform detection. The selection wrapper [`device/selection.ts`](../src/device/selection.ts) is the single point of access to `window.getSelection()` (enforced by lint). See [cursor-and-caret.md](cursor-and-caret.md).
- [`/src/e2e`](../src/e2e) — End-to-end test setup, including Puppeteer and iOS environments. See [testing.md](testing.md).
- [`/src/hooks`](../src/hooks) — React hooks.
- [`/src/recipes`](../src/recipes) — Panda CSS recipes that define styled component variants. New components should use these or inline styles.
- [`/src/redux-enhancers`](../src/redux-enhancers) — Redux enhancers and their helpers. [`undoRedoEnhancer`](../src/redux-enhancers/undoRedoEnhancer.ts) coordinates command transactions and history outside Redux's reducer, then publishes the completed immutable state.
- [`/src/redux-middleware`](../src/redux-middleware) — Redux middleware (e.g. [`clearSelection`](../src/redux-middleware/clearSelection.ts), which clears the browser caret on cursor changes). Document snapshots arrive through [`replaceThoughts`](../src/actions/replaceThoughts.ts), not loading middleware.
- [`/src/selectors`](../src/selectors) — Pure functions that compute (and often memoize) slices from the Redux state. See [data-model.md](data-model.md) for the canonical traversal selectors.
- [`/src/stores`](../src/stores) — Lightweight non-Redux ministores for ephemeral UI state. Examples: [`editingValueStore`](../src/stores/editingValueStore.ts) (the in-progress thought text), [`viewportStore`](../src/stores/viewportStore.ts), [`scrollTopStore`](../src/stores/scrollTopStore.ts), [`gestureStore`](../src/stores/gestureStore.ts), [`syncStatusStore`](../src/stores/syncStatusStore.ts), [`selectionRangeStore`](../src/stores/selectionRangeStore.ts). Also home to the mutable flags that must stay out of Redux for performance and used to live in a globals module — [`touchStore`](../src/stores/touchStore.ts) (`touching`, `suppressCursorAfterTouch`), [`editableSyncStore`](../src/stores/editableSyncStore.ts) (`suppressChange`, `suppressBlurSync`), [`heldKeysStore`](../src/stores/heldKeysStore.ts) (`suppressExpansion`, `arrowKeyBoundaryCross`), and [`abandonImportStore`](../src/stores/abandonImportStore.ts). A `getState()` read subscribes to nothing, so writing one never re-renders, and `resetStores` clears them between tests.
- [`/src/test-helpers`](../src/test-helpers) — Helpers used in unit, store, and JSDOM tests. See [testing.md](testing.md).
- [`/src/util`](../src/util) — Pure utility functions. No React, no Redux access.

## Load-bearing top-level files

- [`/src/index.tsx`](../src/index.tsx) — App entry point: acquires single-tab access and awaits thoughtspace initialization before mounting the interactive `<App />`; renders startup or error UI while it cannot open the document.
- [`/src/initialize.ts`](../src/initialize.ts) — Bootstraps the thoughtspace, the offline-status store, the cursor from URL, and global event handlers. Called by `index.tsx`.
- [`/src/commands.ts`](../src/commands.ts) — Builds the `globalCommands` array, three lookup indices (by id, keyboard, gesture), and the global `keyDown` / `keyUp` / gesture handlers. See [commands.md](commands.md).
- [`/src/constants.ts`](../src/constants.ts) — App-wide constants (root tokens, timeouts, settings enum, `LongPressState`, `COMMAND_DIFFICULTIES`, etc.). For constants used in only one module, define them locally; promote here when shared.
- [`/src/browser.ts`](../src/browser.ts) — Platform detection (`isTouch`, `isSafari`, `isMac`, `isMobile`).
- [`/src/colors.config.ts`](../src/colors.config.ts), [`/src/durations.config.ts`](../src/durations.config.ts) — Design-token configuration consumed by Panda CSS.
- [`/src/service-worker.ts`](../src/service-worker.ts), [`/src/serviceWorkerRegistration.ts`](../src/serviceWorkerRegistration.ts) — PWA service worker setup.

## Where to find...

| Concept | Location |
|---|---|
| Redux state shape | [`@types/State.ts`](../src/@types/State.ts) |
| Thought / Path / Lexeme types | [`@types/`](../src/@types) |
| UI state updates and document command planning (reducer or thunk) | [`actions/`](../src/actions) |
| Synchronous document transaction and Redux publication/history | [`redux-enhancers/undoRedoEnhancer.ts`](../src/redux-enhancers/undoRedoEnhancer.ts) |
| Non-undoable full document publication | [`actions/replaceThoughts.ts`](../src/actions/replaceThoughts.ts) |
| Pure read from state | [`selectors/`](../src/selectors) |
| Non-Redux UI state | [`stores/`](../src/stores) |
| Browser DOM / selection / scroll APIs | [`device/`](../src/device) |
| User-triggered command | [`commands/`](../src/commands) |
| Memory/persistent TreeCRDT peers | [`data-providers/treecrdt/createMemoryThoughtspace.ts`](../src/data-providers/treecrdt/createMemoryThoughtspace.ts), using `@treecrdt/wasm` and `@treecrdt/wa-sqlite` |
| Layout positioning math | [`hooks/usePositionedThoughts.ts`](../src/hooks/usePositionedThoughts.ts) |
| Visible-thoughts traversal | [`selectors/linearizeTree.ts`](../src/selectors/linearizeTree.ts) |
| Pure helper (no React, no Redux) | [`util/`](../src/util) |

## Conventions

- **Pure where possible.** `selectors/` and `util/` should be pure functions; `actions/` is where side effects live. The exception in `selectors/` is a function that has to consult the browser selection to answer a question about state — [`isMultiEditing`](../src/selectors/isMultiEditing.ts) and [`selectionOffsets`](../src/selectors/selectionOffsets.ts), both reading through the `device/selection.ts` wrapper. Neither may be called from a reducer, which must not read the DOM at all; see the reducer purity rule in [`code-standards.instructions.md`](../.github/instructions/code-standards.instructions.md).
- **One concern per directory.** A file that both reads state and dispatches probably belongs in `actions/`, not `selectors/`. A util that imports React belongs in `hooks/` or `components/`, not `util/`.
- **Tests next to source.** Tests live in `__tests__/` subdirectories, not in a separate `tests/` tree.
- **Browser API access is gated.** `window.getSelection`, `localStorage`, viewport reads — all go through `device/` or `stores/` wrappers, not direct calls in feature code.
