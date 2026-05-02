# Folder Structure

The main directory structure is organized as follows. Tests are located in a subdirectory named `__tests__` in each directory.

- [`/src/@types`](../src/@types) - Shared TypeScript type definitions and ambient declarations.
- [`/src/actions`](../src/actions) - Redux reducers and action-creators are co-located. Prefer reducers when possible, as they are pure functions that are more easily testable and composable. Only define an action creator if it requires a side effect. Use [util/reducerFlow](../src/util/reducerFlow.ts) to compose reducers.
- [`/src/commands`](../src/commands) - Keyboard, gesture, and toolbar commands (formerly `shortcuts`).
- [`/src/commands.ts`](../src/commands.ts) - Top-level commands manifest that wires individual command modules into the global keyboard and gesture handlers.
- [`/src/components`](../src/components) - React components.
- [`/src/constants.ts`](../src/constants.ts) - Constant values. For constants that are only used in a single module, start by defining them in the module itself. They can be moved to `constants.ts` if they need to be used in multiple modules or if there is a strong case to define them separately, e.g. an app-wide configuration that may need to be changed or tweaked.
- [`/src/data-providers`](../src/data-providers) - Storage and sync backends (e.g. YJS) implementing the `DataProvider` interface.
- [`/src/device`](../src/device) - Device/DOM-level helpers for selection, scrolling, clipboard, and focus.
- [`/src/e2e`](../src/e2e) - End-to-end test setup, including Puppeteer and iOS environments.
- [`/src/hooks`](../src/hooks) - React hooks.
- [`/src/recipes`](../src/recipes) - Panda CSS recipes that define styled component variants. New components should use these or inline styles.
- [`/src/redux-enhancers`](../src/redux-enhancers) - Redux enhancers.
- [`/src/redux-middleware`](../src/redux-middleware) - Redux middleware.
- [`/src/selectors`](../src/selectors) - Select, compute, and possibly memoize slices from the Redux state.
- [`/src/stores`](../src/stores) - Lightweight non-Redux ministores for ephemeral UI state (e.g. editing value, viewport, scroll position).
- [`/src/util`](../src/util) - Miscellaneous.
