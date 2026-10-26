### Architecture

- Before writing new code, search the codebase for related mechanisms and existing architecture.
- Prefer extending or reusing existing infrastructure over creating new solutions. Reuse a helper only where it sits at the layer that owns the problem, not merely where it fits the shape of the fix.
- Update dependent state at the source of the change, in the action that makes it, while both the old and the new value are known. Do not reconstruct it afterwards from the result: what changed is no longer known, so recomputing is guesswork. For example, [`moveThought`](../../src/actions/moveThought.ts) rebases the selection Paths from `oldPath` to `newPath`; see [Stored Paths and moves](../../docs/data-model.md#stored-paths-and-moves). `recomputePath` in `executeCommandWithMulticursor` ([`commands.ts`](../../src/commands.ts)) resolves Paths again with `thoughtToPath` after a command runs. It restores the Paths that the command itself captured beforehand, and it is not a pattern for fixing stale state elsewhere. A last-resort safety net is fine, but it does not replace the fix at the source.
- Do not access the app `store` directly. To read fresh state, dispatch a thunk and use `getState()` — this avoids importing the app `store` or adding it to a hook's dependency list:
  ```ts
  dispatch((dispatch, getState) => {
    const state = getState()
    // ...
  })
  ```

### Files, modules, and exports

- Do not create new files for constants, hooks, components, selectors, or helper functions that are only used in a single file. Instead, define them in the same file where they are used.
  - Prefer co-located functions over unnecessary abstraction. If a function is only used in one module, define it there instead of abstracting it out into a separate file.
- Avoid thin functions that give the appearance of abstraction. Before extracting a function, confirm it earns its place by answering yes to at least one of the questions below; if the answer is no to all three, inline it at the call site. A thin function enlarges the internal API while hiding the code that mattered — the significant call it wraps (e.g. a lifecycle hook such as `evaluateOnNewDocument`, or a subscription), or the condition it evaluates — making the control flow harder to follow than the code it replaced.
  - Does it reduce duplication? A helper called once does not. Neither does a single short expression repeated at a few call sites, such as `a || b` — repeating it at each call site is cheaper to read than a jump.
  - Does it establish an encapsulation boundary? A helper whose only consumers live in the same module does not. Neither does a helper whose parts stay public: it hides something only when callers stop needing what it wraps. If `a` and `b` remain exported and read directly elsewhere, an `isAOrB()` beside them hides nothing — it adds a third name for readers to learn, alongside the two it was meant to replace.
  - Does it hide meaningful complexity? A one- or two-line body that just forwards its arguments does not. Neither does a body that is a single boolean expression, ternary, or lookup — inline the expression, and put any explanation in a comment above it rather than a JSDoc on a helper:
    ```ts
    // ✗ too thin: the whole function is one ternary
    /** Resolves the repeat command to the last command that was executed. */
    const resolveRepeat = (command: Command): Command | null => (command.id === 'repeat' ? lastCommand : command)

    // ✓ inline at the call site
    // the repeat command resolves to the last command that was executed
    const resolved = command.id === 'repeat' ? lastCommand : command
    ```
    Multi-line logic with branches or early returns is fine to extract.
- Do not wrap a store in bare getters and setters. A function whose entire body is `someStore.getState().foo` or `someStore.update({ foo })` adds no behavior; it obscures which store the value comes from and expands the module's API for nothing. Read and write the store directly at the call site. A wrapper that carries real logic — managing a timer, setting a companion flag, deriving the value from state — is not bare and earns its place.
  ```ts
  // ✗ bare getter/setter
  export const isBatchEditing = () => batchEditingStore.getState().batching
  export const setBatchEditingUndoLabel = (undoLabel: string) => batchEditingStore.update({ undoLabel })

  // ✓ use the store directly at the call site
  batchEditingStore.getState().batching
  batchEditingStore.update({ undoLabel })
  ```
- Only a single, default export is allowed. Named exports are not allowed.
  - Exception: action-creators are co-located with reducers in `src/actions` and exported as named exports.
  - Filenames should exactly match the default export name.
  - Name every ministore with a `Store` suffix (e.g. `viewportStore`), and name a module that default-exports one after it (`viewportStore.ts`). The `em/ministore-store-suffix` lint rule enforces both; a bare local `store` is allowed for one that is wrapped before it is exported.

### Functional Programming

- Prefer pure functions.
- Reducers in `src/actions` must not read the DOM. The browser selection, focus, and element geometry live outside Redux state, so a reducer that reads them returns different state for the same arguments and cannot be exercised without a document. Read them in the action-creator co-located with the reducer and pass the values in the payload, as `extractSubthought` and `extractCategory` do with `selectionStart` and `selectionEnd`.
  - Generating a value is not the same as reading the environment. Reducers may call `timestamp()` and `createId()`, which the thought and lexeme records require.
- Prefer ternary operators over if statements.
- Avoid mutations and side effects when possible.
- Use `const`; avoid `let`.
- Avoid `for` loops; use `map`, `filter`, `reduce`.
- Use point-free style when appropriate: Avoid `setTimeout(() => cb())`; use `setTimeout(cb)`.

### React

- Use hooks.
- Do not define React contexts (`createContext`, a context `Provider`, or `useContext` on one of em's own contexts). They are not one of the project's conventions, and the app does not need another way to manage state: Redux, ministores, and props already cover nearly everything. Bringing in context would be a larger design decision than any single change should make. Use instead:
  - Redux (`useSelector`, or a thunk with `getState()`) for app state that takes part in undo, persistence, or selectors.
  - A [ministore](../../docs/glossary.md#m) in `src/stores` for ephemeral UI state, read with its own `useSelector`.
  - Props for everything else, DOM refs included, even when that means passing them down through several components.
  - Reading a context that a third-party library exposes as its public API, such as motion's `MotionConfigContext`, is fine. The contexts in `src/components/modals/Export.tsx` are older than this rule and are left as they are. Do not copy them.

### CSS

- Inline styles using PandaCSS: `className={css({ marginTop: '1em' })}`
- Only use style attribute for dynamic runtime values. PandaCSS can only handle statically analyzable values.
- Never spread a variable into `css()`, `css.raw()`, `cva()` or `sva()`. PandaCSS v2 generates no CSS for a spread variable that holds a conditional (`const styles = flag ? { ... } : {}` or `flag && { ... }`), and nothing fails: the element gets the class name, but the stylesheet has no rule for it. Give each property its own ternary (`border: flag ? '1px solid {colors.panelBorder}' : undefined`), or spread the object literal inline (`...(flag ? { ... } : {})`), which PandaCSS does extract. Recipes and `panda.config.ts` are exempt because they are executed rather than statically extracted. Lint enforces this with `no-restricted-syntax`.
- Set an image with `css({ backgroundImage: preloadImage('/img/...') })`. [`preloadImage`](../../src/util/preloadImage.ts) starts loading the image ahead of time, so it is decoded before it is first shown rather than loading in while it animates in, and `backgroundImage` in `css()` accepts no other `url()`, so an image that skips it does not compile. It starts loading the image on its first call, so call it somewhere that runs before the image is shown: the top level of the module always is, and inside a component it is only if the component renders while the image is still hidden. Pass it a string literal, because the build reads each call as the `url()` it returns and only recognizes a literal. For an image chosen at runtime, make an object of `css()` classes keyed by the runtime value, as [`SidebarGlow`](../../src/components/Sidebar/SidebarGlow.tsx) does. Recipes keep a plain `url()`, because they run when PandaCSS builds rather than in the browser; the build appends a preload of each recipe's images to its generated module instead. The type cannot reach the `background` shorthand or an inline `style`, so lint rejects a `url()` in either with `no-restricted-syntax`. Lint also rejects a plain `url()` for `backgroundImage` in `css()`, which the type already does, because the type error can only list the values it accepts and cannot say to use `preloadImage`. To deliberately show an image without preloading it, cast it (`'url(/img/...)' as PreloadedImageUrl`), the same way a `SimplePath` is made from a `Path`, so that the exception is visible in review.
- Pass style overrides across a component boundary as a `className` generated by `css({ … })` at the call site, never as a style object. PandaCSS extracts the call site, so a `css({ … })` there produces real CSS, while a component that received the object and called `css(theObject)` produces none — the element gets a class name with no rule behind it, and nothing fails. Apply the incoming class name with `cx(someRecipe(), className)`; overrides win over a recipe because the `utilities` cascade layer comes after `recipes`. Consequently a component should not set a property in its own `css({ … })` that callers are expected to override: `cx` only concatenates class names, so two classes setting the same property are resolved by their order in the stylesheet, not by the order of the arguments. Where a component needs to own such a property, give it an explicit prop and pick between complete `css({ … })` objects, as [`GestureDiagram`](../../src/components/GestureDiagram.tsx)'s `display` does.
- Prefer inline CSS over recipes. Only add a recipe in `src/recipes` when the styles have variants or are shared by multiple components. A single-use recipe with only base styles should be inline CSS instead.
- Treat `position: fixed` emulation in mobile Safari as a last resort while the virtual keyboard is up. While the keyboard is open, Safari lets fixed elements drift away from the visible area, and the workaround is to reposition the element from JavaScript as the page scrolls, which is what [`usePositionFixed`](../../src/hooks/usePositionFixed.ts) does. Any such emulation lags, however it is built. Safari scrolls the page on its own thread and reports the scroll to the page afterwards, so anything positioned from scroll events lands at least a frame late, and the element jitters during flicks and rubber-band overscroll. The project has fought this many times for the toolbar ([#3758](https://github.com/cybersemics/em/issues/3758), [#3325](https://github.com/cybersemics/em/issues/3325), [#4091](https://github.com/cybersemics/em/pull/4091)). So before reaching for emulation, whether for a new element or to fix a drift bug in an existing one, look for a solution that leaves positioning to the browser: keep the element in normal flow while the keyboard is up, as the nav bar does by dropping `position: sticky`; hide it while the keyboard is up; or repair Safari's stale rendering when the keyboard opens or closes, rather than tracking the scroll. Only when an element must stay pinned to the visible area while the keyboard is up, and none of these will do, use `usePositionFixed`. Do not write another emulation alongside it. [iOS Safari Viewport](../../docs/ios-safari-viewport.md) describes the mechanism, the overscroll and stale-rendering bugs, and the approaches that failed. The Capacitor app does not have this problem, because the native keyboard plugin reports the keyboard geometry, so an element there can stay `position: fixed` and offset itself by the keyboard height.

### Performance

em is highly performance sensitive. It renders large thought trees on phones, and it has to keep up with scrolling, typing, gestures and the virtual keyboard animation without dropping frames. Weigh the rendering cost of every change before you propose it, not after a reviewer asks.

- Treat a layout recalculation as a cost that has to be justified. These all force the browser to recalculate layout:
  - reading geometry: `getBoundingClientRect`, `offsetHeight`/`offsetTop`, `clientHeight`, `scrollHeight`, `getComputedStyle`, or `innerHeight` after a style change;
  - writing a property that affects geometry: `top`, `left`, `width`, `height`, `margin`, `padding`, `font-size`, or `display`;
  - inserting, removing or remounting an element.
- Never cause a layout from a handler that fires continuously: `scroll`, `touchmove`, `pointermove`, `input`, a `visualViewport` resize, or anything that runs once per frame. These fire dozens of times a second. On iOS, `visualViewport` resize also fires repeatedly while the user scrolls with the keyboard up, not only when the keyboard opens and closes. When you need a measurement, take it once at a discrete event (a keyboard open or close, a cursor change), or throttle it well below the frame rate.
- Do not interleave geometry reads and writes in the same frame. Every read that follows a write forces a synchronous layout, and doing it in a loop thrashes. Read everything first, then write.
- Prefer changes that only the compositor has to handle. Changing `transform` or `opacity` on an element that already has its own layer moves or fades it without layout or repaint. Switching between two transform values stays on the compositor, but going from no transform to one can force a layout, so an element you will animate this way should keep a do-nothing transform at all times.
- Do not repair a rendering glitch by remounting a component, such as by bumping its `key`. A remount discards the subtree and lays it out again. Look for a change that only the compositor has to handle first.
- Keep debug instrumentation off hot paths. A `debugLog` entry that reads geometry belongs on a discrete event, not on every scroll or keystroke, and only while it is answering an open question.
- Pass a `debugLog` entry's fields as an object only when every value is static (a variable, a property read that does not force layout, a literal). When any value calls a function or reads layout, pass a function that returns the fields instead, and compute them inside it, never above the call, so nothing is computed while logging is off. Guard scheduled work and anything else that only exists for the log with `debugLog.isEnabled()`. The `em/no-precomputed-debug-log-fields` lint rule enforces both. See [Debug Log](../../docs/debug-log.md#adding-an-entry).
- Do not call a change cheap unless you measured it. Either measure it (Safari Web Inspector's Timelines, Chrome DevTools' Performance panel) or say it is unmeasured, and name the operations it triggers (style recalculation, layout, paint, composite) and how often it runs.

### Code Quality

- Write a JSDOC comment for each function definition.
- Add descriptive comments to code that is counterintuitive, non-obvious, or requires explanation.
- JSDOC prose must be complete sentences (`jsdoc/require-description-complete-sentence`). Put shell commands, which are neither capitalized nor sentence-terminated, in a fenced code block, and end the lead-in line with a period rather than a colon — a colon merges the fence into the preceding paragraph and the rule then demands a period after the command. For a single command, inline code inside a sentence reads better than a fence: ``Run manually with `node scripts/estimate/src/backfill.ts`.`` Never let the rule's autofixer capitalize a command, path, or identifier.
  - A sentence that opens with anything other than a letter — an issue reference such as `#5560`, a figure, a backticked identifier — fails the rule with no way to satisfy it, and the reported line is not the offending one: the position is an offset into the description block, so it can land paragraphs away from the text `--fix` will actually rewrite. Read the fix before taking it. Left to itself the autofixer capitalizes the first word it can reach, which on a multi-line description means an ordinary word in the middle of a sentence. Reword the opening instead: "That is how #5560 landed" passes where "#5560 landed" cannot.
- Prefer an options object over a long list of positional arguments. A call like `useGestureHighlight(command, gestureInProgress, true, false)` is unreadable at the call site — the booleans and bare strings say nothing about what they mean, and their order is only recoverable by opening the definition. Destructure a single object instead and document each property inline with the type, which puts the names at the call site and makes the order irrelevant:
  ```ts
  // ✗ opaque at the call site
  const useGestureHighlight = (command: Command, gestureInProgress: string | undefined, selected: boolean | undefined, disabled: boolean) => ...

  // ✓ named at the call site
  const useGestureHighlight = ({ command, gestureInProgress, selected, disabled }: {
    /** The command whose gesture diagram to highlight. */
    command: Command
    /** The raw gesture string traced so far, or undefined if none active. */
    gestureInProgress: string | undefined
    ...
  }) => ...
  ```
  - The one or two arguments that identify the subject may stay positional, with the rest in a trailing options object, as `getSortedRank(state, id, value, { staleId })` does. This is the usual shape for selectors and reducers, whose leading `state` argument is unambiguous.
  - React components already receive a props object, so this rule is about ordinary functions and hooks.
- Avoid overly vague variable names or extraneous affixes such as "data".
- Avoid redundancy in code and naming.
