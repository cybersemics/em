# Folder Structure

The main directory structure is organized as follows. Tests are located in a subdirectory named `__tests__` in each directory.

- [`/src/App.css`](https://github.com/cybersemics/em/blob/main/src/App.css) - Legacy styles. New components should use inline styles.
- [`/src/actions`](https://github.com/cybersemics/em/tree/main/src/reducers) - Redux reducers and action-creators are co-located. Prefer reducers when possible, as they are pure functions that are more easily testable and composable. Only define an action creator if it requires a side effect. Use [util/reducerFlow](https://github.com/cybersemics/em/blob/main/src/util/__tests__/reducerFlow.ts) to compose reducers.
- [`/src/constants.ts`](https://github.com/cybersemics/em/blob/main/src/constants.ts) - Constant values. For constants that are only used in a single module, start by defining them in the module itself. They can be moved to `constants.js` if they need to be used in multiple modules or if there is a strong case to define them separately, e.g. an app-wide configuration that may need to be changed or tweaked.
- [`/src/components`](https://github.com/cybersemics/em/tree/main/src/components) - React components
- [`/src/hooks`](https://github.com/cybersemics/em/tree/main/src/hooks) - React hooks
- [`/src/redux-enhancers`](https://github.com/cybersemics/em/tree/main/src/redux-enhancers) - Redux enhancers
- [`/src/redux-middleware`](https://github.com/cybersemics/em/tree/main/src/redux-middleware) - Redux middleware
- [`/src/selectors`](https://github.com/cybersemics/em/tree/main/src/selectors) - Select, compute, and possibly memoize slices from the Redux state.
- [`/src/shortcuts`](https://github.com/cybersemics/em/tree/main/src/shortcuts) - Keyboard and gesture shortcuts
- [`/src/util`](https://github.com/cybersemics/em/tree/main/src/util) - Miscellaneous
