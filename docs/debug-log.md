# Debug Log

A rolling record of what **em** did, kept on the device so that a bug nobody can reproduce still leaves evidence behind. It exists for the failures that defeat ordinary debugging: a freeze that takes the console with it, a gesture that misfires once a week, a thought that lands under the wrong parent on someone else's phone and nowhere else.

Implementation: [`src/util/debugLog.ts`](../src/util/debugLog.ts). The bulk of its content comes from [`loggerMiddleware`](../src/redux-middleware/loggerMiddleware.ts), which captures every dispatched action; the rest comes from the editor ([`Editable`](../src/components/Editable.tsx)), gestures ([`MultiGesture`](../src/components/MultiGesture.tsx)), the iOS app's keyboard events ([`iOSCapacitorHandler`](../src/device/virtual-keyboard/handlers/iOSCapacitorHandler.ts)), drag-and-drop ([`useDragAndDropThought`](../src/hooks/useDragAndDropThought.tsx), [`useDragAndDropSubThought`](../src/hooks/useDragAndDropSubThought.tsx), [`DropHover`](../src/components/DropHover.tsx) and [`DropEnd`](../src/components/DropEnd.tsx)), programmatic scrolls ([`scrollCursorIntoView`](../src/device/scrollCursorIntoView.ts), [`scrollTo`](../src/device/scrollTo.ts), and autocrop in [`LayoutTree`](../src/components/LayoutTree.tsx)), app switching, viewport resizes and uncaught errors ([`initEvents`](../src/util/initEvents.ts)), render errors ([`ErrorBoundaryContainer`](../src/components/ErrorBoundaryContainer.tsx)), and persistence ([`pushQueue`](../src/redux-enhancers/pushQueue.ts)).

## What it is

A bounded buffer of 5000 entries, sharded across ten rotating `localStorage` keys so appending one entry rewrites 500 entries rather than all of them. Writes are **synchronous**, which is the whole point: an entry survives the freeze that happens on the next line. The log stays on the device until a person exports it or explicitly opts to attach it to feedback.

Every entry shares an envelope and adds its own fields. As `format()` exports it:

```
--- date: 2026-10-11
09:12:10.849 +6ms #34 action editThought {"oldValue":"","newValue":"S","path":["53484e1cb3"],"cursorOffset":1}
```

Left to right: the UTC time of day, `dt` (milliseconds since the previous entry), `seq`, the type, the actionType (on `action` entries only), and the event-specific fields.

`seq` is monotonic, so a gap means entries were dropped and a counter climbing while `dt` collapses toward zero means a runaway loop.

The export is read only by agents, so it is shaped for tokens rather than for a person. Each entry carries the UTC time of day, under a `--- date` line written before the first entry and wherever the date changes. Thought ids are cut to their first 10 characters everywhere in the export, the `--- state` line and `--- state.thoughts` dump included — at that length two of the roughly 2000 ids a full buffer holds share a prefix about once in a million logs — while reserved ids such as `HOME_TOKEN` stay whole. An action's payload is parsed back out of the string it was logged as and spread into the fields. Fields that carry nothing are dropped: `isComposing: false`, a `value` that only repeats a reserved id, and the `label` and `source` of `commandMetadata`, which repeat its `commandId`. All of it happens on export: the stored buffer keeps payloads stringified so the 2000-character field cap bounds them in `localStorage`, and a payload that cap has cut stays a `payload` string.

A `format()` dump wraps the entries in header and trailer sections. Above them, a `--- device` / `--- userAgent` / `--- version` / `--- commit` / `--- display` / `--- url` header, rendered at format time so it survives however much the rolling buffer has evicted. `--- device` names the hardware model in the native app (`iPhone15,4` for an iPhone 15, from the Capacitor Device plugin), and only the device family (`iPhone`) in a browser, which hides the model. `--- display` names whether em is an installed PWA or a browser tab, the orientation, device pixel ratio, pinch-zoom scale and bottom safe-area inset. `--- url` is the page the log was copied from, which tells production, a preview deployment and localhost apart. When entries before the first retained one are gone — the buffer wrapped, or a storage quota error dropped older chunks — a `--- evicted: N earlier entries` line follows, since `seq` counts from the last `clear()`. Below them, `--- lastFrameAt`, the last animation frame the page painted; `--- gestures`, the touch paths of the last five gestures; `--- state`, the view the log ended on — the cursor path, caret offset, whether the keyboard was open and the note focused, and how many paths were expanded, how many multicursors were set and how deep the undo and redo stacks were; and `--- state.thoughts`, every thought by id, value, rank and parent. The view is there because the entries can only reconstruct it from `setCursor` and its kin, which a long session evicts first. The frame marker is what separates a freeze *in* the app from one below it — if the marker keeps advancing past the last entry, the page was still painting and the hang is at the native layer.

Logging is **off** in production unless the user turns on **Debug Logging** in Settings. It auto-enables on localhost and `*.vercel.app`, excluding test environments (Vitest via `MODE`, Puppeteer via `navigator.webdriver`) and the native Capacitor and Tauri shells, which serve production builds from localhost-like origins. On an auto-enabled host the Settings checkbox switches a device-local opt-out instead of the synced setting, so a preview build can be aligned with production for performance testing without disabling logging on the user's other devices.

## Adding an entry

An entry's fields take one of two forms. Fields whose values are static — variables, property reads, literals — are passed as an object: `debugLog.log('swipe', { dir, sequence: this.sequence })`. Fields that call anything, `Math.round` included, or read a property that forces layout or serializes the DOM (`scrollY`, `scrollHeight`, `offsetTop`, `textContent` and the like, which do work without parentheses) are passed as a function returning the object: `debugLog.log('touchstart', () => ({ x: Math.round(x), y: Math.round(y) }))`. Logging is off for almost every production user, and the function is called only while it is on, so that work is never done to be thrown away. An object of static values costs only its own allocation. The `em/no-precomputed-debug-log-fields` lint rule reports a call, a construction or one of those property reads in a fields object, and says to pass a function instead.

`log` calls the function synchronously, so it reads the same values an object would have, and inside its own `try`, so a field that throws (reading a node that has since been removed, say) drops that one entry rather than escaping into the code that logged it. An entry with no fields, `debugLog.log('x')`, needs neither.

The function only defers what is written inside it. Three kinds of work still need an explicit `debugLog.isEnabled()` check around them:

- **Work scheduled for later.** A field read on the next animation frame must check before calling `requestAnimationFrame`, or every user pays for the scheduled callback.
- **Work that feeds an entry without being one of its fields.** `loggerMiddleware` captures the state before an action to diff it afterwards, and `logViewport` in [`initEvents`](../src/util/initEvents.ts) compares the geometry with the last entry to skip duplicates.
- **A value computed before the call.** `const rect = range.getBoundingClientRect()` above `debugLog.log('x', () => ({ rect }))` runs whether or not logging is on. Compute it inside the function instead. The `em/no-precomputed-debug-log-fields` lint rule reports a variable that is read only by `debugLog.log` calls, unless its declaration sits behind one of the guards above (inside `if (debugLog.isEnabled())`, after `if (!debugLog.isEnabled()) return`, or in an initializer conditional on it, such as `enabled ? compute() : []`). A guard around the function the variable is declared in does not count, since the rule cannot tell where that function is called; when a function is only ever called under a guard, compute the value inside the fields function anyway, or disable the rule for that line.

## Getting the log off a device

| Who | How |
| --- | --- |
| A person | **Settings → Debug Logging → Download debug log** (or **Share** in the native apps, which have no download manager), or **Copy debug log**. On a touch screen, the secret gesture →↓←↓↑ does the same as **Download debug log** while Debug Logging is on. |
| A script or agent | `window.em.debugLog` — `format(state)`, `read()`, `clear()`, `setEnabled()`, `setConsole()`. |
| An agent reproducing a bug | [`scripts/debug-log-capture.ts`](../scripts/debug-log-capture.ts), which attaches through the e2e bridges and writes to a file. |

A reporter attaches the downloaded file to an issue under a `## Debug Log` heading — see [`create-issue`](../.github/skills/create-issue/SKILL.md).

The log carries thought text verbatim, in value fields, typed keystrokes, action payloads and the `state.thoughts` dump. An agent quoting a reporter's log into an issue replaces the personal parts of that text with placeholders first, keeping Lexemes intact; [`create-issue`](../.github/skills/create-issue/SKILL.md#anonymizing-user-data) lists every place it appears.

### Streaming to the console

`debugLog.setConsole(true)` mirrors every entry to `console.info` as it is appended, behind a `debugLog` prefix, in the same line format `format()` writes, `--- date` lines included. The choice is recorded in `localStorage`, so it survives the page reloads a reproduction performs — though not `localStorage.clear()`, which takes it along with everything else.

It is **off by default on every host**, including the ones where logging itself auto-enables. The log captures every `selectionchange` and every input event, so mirroring it buries the console for anyone not specifically reading it.

Use it to watch a single interaction live, through a browser MCP's console listing. Do not use it to capture a whole reproduction: four steps of editing produce about 6 KB, and a full buffer approaches a megabyte. Dump the buffer to a file instead.

## In tests

In Puppeteer, a test under investigation for a flake is wrapped in [`withDebugLog`](../src/e2e/puppeteer/helpers/withDebugLog.ts), which records the log and appends it to the error if the test fails.

Logging is off in Vitest and Puppeteer, so a test that wants entries calls `debugLog.setEnabled(true)` and usually `debugLog.clear()` right after, to drop the session marker. It cleans up nothing afterwards: the module's in-memory state is restored at every test boundary by `resetStores` (see [Isolation and cleanup](testing.md#isolation-and-cleanup)), which runs the `reset` that `debugLog.ts` registers.

- **What a clean slate is.** Logging off, the frame heartbeat cancelled, the buffer and its counters empty, the console mirror off: what a module load produces against empty storage on a host that does not auto-enable. It is written out explicitly rather than derived from the values the variables were constructed with, because those are not clean — the buffer is initialized from whatever `localStorage` held at import, i.e. a previous session's log.
- **Reset is not `clear()`.** `reset` touches memory only. `clear()` is the operation that erases the persisted log, and resetting between tests must never be able to cost a user theirs. A test owns its own `localStorage` and clears it itself.
- **Why it has to be automatic.** The heartbeat reschedules itself through `requestAnimationFrame`, which fake timers fake. Left running by one test, it makes `vi.runAllTimersAsync` abort with `Aborting after running 100000 timers` in whichever teardown drains timers next — `cleanupTestApp` does — far from the test that enabled logging. Within a test the same applies: while logging is enabled, flush with `vi.runOnlyPendingTimersAsync`, not `vi.runAllTimersAsync`.
- **What it does not cover.** Import-time behaviour — hydrating the previous session's entries, deciding `autoEnabled` once from the real environment, and self-enabling on an auto-enable host — is unchanged, and the tests of it still `vi.resetModules()` and import a fresh instance. A reset module graph has its own registry that no fixture reaches, so such a test stops its fresh instance itself (`fresh.setEnabled(false)`).

## Comparing two logs

The reason to capture a log while reproducing a bug is to hold it against the reporter's. The entry where the two stop agreeing is the strongest lead a hard-to-identify bug offers.

`diff` cannot do this. Two runs of the *same* steps share almost no bytes, because every entry carries a fresh sequence number, timestamp and delta, and every thought carries a random 128-bit id:

```
#16 action newThought {"at":null,"value":""}
#20 action editThought {…"path":["97e810f0c6"]…}

#56 action newThought {"at":null,"value":""}
#60 action editThought {…"path":["94701f3dbf"]…}
```

Those are the same two keystrokes. Measured on two live captures of one four-step interaction: `diff` reports **79 of 84 lines changed**.

[`scripts/debug-log-diff.ts`](../scripts/debug-log-diff.ts) compares behaviour instead. Each entry is reduced to a **signature** — its type plus its fields with the volatile parts neutralized — and the two signature streams are aligned by longest common subsequence:

- `seq`, `t` and `dt` are dropped.
- Thought ids are numbered by **first appearance within their own log**, so the nth distinct thought either log creates gets the same placeholder in both. That is what makes two runs of the same steps compare equal.
- Reserved ids ([`HOME_TOKEN`](../src/constants.ts) and the rest, all carrying 24+ leading zeros) are left alone. They mean the same thing on every device, so canonicalizing them would discard the only ids that are directly comparable.
- Per-device nonces and wall-clock stamps — `clientId`, `updatedBy`, `lastUpdated` — are masked, in the plain form and in the escaped form they take inside a payload the field cap cut, which stays a string.
- The environment is reported side by side rather than compared, since it differs between any two devices by construction. It is read from the `---` header, falling back to the `session` entry for an excerpt read off the console mirror, which has no header — the header is preferred because the session entry is an ordinary entry, which the rolling buffer evicts in exactly the long sessions whose logs are most worth comparing.
- `frameGap` entries are dropped by default: they measure how loaded the device was, so a reporter's phone produces many and a headless browser almost none. `--include frameGap` keeps them, which is what a freeze or jank report wants.

Those same two captures compare as **identical**. The report is bounded, so neither log's size reaches the reader.

The procedure an agent follows — download, arm, drive, capture, compare, and how to read the result — is [`compare-debug-log`](../.github/skills/compare-debug-log/SKILL.md), invoked from [`reproduce`](../.github/skills/reproduce/SKILL.md) when an issue carries a log.

## Reading a log

Some shapes worth recognizing:

- **The `--- commit` header names the build the log came from.** Before treating a report as a regression of a fix, check that the fix is in that build: `git merge-base --is-ancestor <fix commit> <logged commit>` after fetching `main`.
- **`viewport` entries from an iPhone** are read against the two viewports Safari keeps while the keyboard is open; [iOS Safari Viewport](ios-safari-viewport.md) explains which field fixed elements follow and what a stale or uncovered fixed element looks like in them.

- **An `error` entry** is an uncaught error, with its name, message and stack (cut at the 2000-character field cap). Its `source` says where it was caught: `window` for an uncaught exception, which also shows the error banner; `unhandledrejection` for a rejected promise nothing handled, which is logged and nothing more; `render` for a component that threw while rendering, which replaces the app with the error screen and carries a `componentStack` locating it in the tree.
- **A `push` with no matching `pushSynced`** is a write that never completed. See [Persistence](persistence.md).
- **An `integrity` entry** reports siblings sharing an exact rank, which makes their order ambiguous and is the signature of a data-integrity fault.
- **Drag-and-drop entries** follow a drag from the target under the pointer to what was drawn and what happened on release. A `dropTarget` entry is written each time the pointer moves onto a different drop target, with its `zone` (`ThoughtDrop` to insert before the thought, `SubthoughtsDrop` to drop as a child or at the end of a list), the pointer's `x` and `y`, and whether the target accepts the drop: `canDrop: true`, or `canDrop: false` with the `reason` it refused (`dragInactive`, `contextView`, `descendant`, `hidden`, `divider`). A `dropHover` entry is written when a drop hover is drawn, before a thought (`zone: "thought"`) or at the end of a list (`zone: "end"`). A `dragEnd` entry closes every thought drag with `didDrop`. A `dropTarget` with `canDrop: true` and no `dropHover` after it is a target that accepts the drop without showing it. A `dragEnd` with `didDrop: false` after the user released over a thought is a drop that was refused, and the last `dropTarget` before it gives the reason. A `drop` entry follows an accepted drop.
- **`move` entries** are diffed out of the thought index rather than logged by any one reducer, so they catch a reorder from every source — drag and drop, sort, undo, remote sync — without special-casing any of them.
- **The log stopping while `lastFrameAt` keeps advancing** means the page was still painting: the hang is below the app.
- **A `touchend` logged within a few milliseconds before the next `touchstart`** is one that iOS 27 withheld until that touch began ([#5660](https://github.com/cybersemics/em/issues/5660)); a `touchend` that arrived on time precedes the next `touchstart` by the gap between the taps. A `longPressEnd` with `eventType: "mouseup"` is a press that the lift's `mouseup` ended, since iOS still fires `mouseup` when a withheld touch lifts.
- **A `touchend` with `moves: 0`** received no `touchmove` events, where `moves` counts them from the first finger landing. A tap ends that way too; a swipe that ends that way, with coordinates equal to its `touchstart`'s and arriving just before the next `touchstart`, was swallowed by iOS, as in the gesture dead zone near the caret ([#4222](https://github.com/cybersemics/em/issues/4222)).
- **A `touchCaret` entry** follows a `touchstart` by one frame while a thought is being edited. It gives the caret's position and height (`x`, `y`, `height`) and the edges of the thought being edited (`editableLeft`, `editableTop`, `editableRight`, `editableBottom`), all in viewport coordinates like the touch's own, so a touch can be placed relative to the caret. It is read a frame late so as not to force a pending layout inside the touch handler; the caret does not move before the finger lifts.
- **`--- gestures`** holds the full touch path of the last five gestures, one line each: the time of its `touchstart` (which matches that entry's time), the sequence it was recognized as, `abandoned` if it executed nothing, and every `touchmove` of the finger that drew it as `ms:x,y` from the `touchstart`, in viewport coordinates. It shows why a swipe was read as it was — a turn drawn as a diagonal, a stroke too short to register — which the `swipe` and `gesture` entries, carrying only the recognized directions and the endpoints, cannot. The traces are kept apart from the entries under their own `localStorage` key, rewritten in place, so a swipe's dozens of points never evict entries, and the section never grows past five lines. Touches abandoned before their first swipe, such as scrolls, are not kept. A log downloaded with the secret gesture spends the last of the five on that gesture.
- **`dt` collapsing toward zero across many entries** is a tight loop.
- **An `undoPatchError` entry** precedes the "Error applying patch" error. It names the action that failed to merge into the last undo step (which is otherwise missing from the log, since the throw unwinds the dispatch before it is logged) and lists that step's op paths, the one that no longer resolves among them.
- **`scroll` entries** are programmatic scrolls, named by `source`: `cursor` when the cursor was scrolled into view, with the inputs to that decision (the cursor's `y` and `height` in the layout tree, `layoutTreeTop`, `scrollY`, the cursor's `yViewport`, the `toolbarBottom` and `bottomBoundary` it had to fit between, whether the keyboard was open, the `visualViewportHeight` and `effectiveViewportHeight` that set the bottom boundary, the document's `scrollHeight`, and the resulting `top` and `behavior`); `scrollTo` for an explicit scroll to the top, the bottom or a position; `autocrop` when the space above a deep cursor is cropped and the page scrolled by the same amount. The `scrollY` an `autocrop` entry carries was read during render, so a user scroll between render and the entry is overwritten. One `autocrop` entry with `autocrop` equal to `autocropLast` is written when the thoughts first render; it is not a crop, but it still scrolls to that render-time position. Scrolls that leave the cursor in view log nothing. The resulting movement shows in the `viewport` `scrollStart` and `scrollEnd` entries that follow.
- **`focus` and `blur` entries** (touch WebKit only: iOS Safari and the iOS app) describe the active element by tag, `data-testid`, `aria-label` — an editable's carries its thought id — and `contenteditable` attribute. At `blur` the active element is almost always `BODY`, so the informative field is `relatedTarget`, the element focus is moving to. A `tap` entry carries `isKeyboardOpen`, `noteFocus` and `cursorOffset` as Redux has them, beside the `activeElement`, so a false edit mode or caret can be traced to the tap where the two first disagree.
- **A `caret` entry** is a programmatic caret placement — on Enter, a gesture, undo, or a tap — naming the thought, the `offset`, whether focus was routed through `asyncFocus`, and whether the editable was `hidden` (in which case the selection is cleared instead). Programmatic focus is what makes iOS scroll an editable into view.
- **`keyboard` entries** (iOS app only) are the keyboard as iOS reports it: `willShow` with the `rawHeight`, and `willHide`. A `willShow` marked `ignored` arrived during a drag and changed nothing. Compare them with the `keyboardOpen` actions that set `isKeyboardOpen` to see which side moved first when edit mode disagrees with the screen.
- **`viewport` entries** record the window, layout viewport (`clientHeight`) and visual viewport sizes, the scroll position and document height (`scrollHeight`), the screen orientation the browser reports (`orientation`), and whether the keyboard is open. One is written on every resize that changes them, one when the app becomes active (`resume`), one on each frame in the following second in which the visual viewport changed (`frame`), one a second later (`settled`), since iOS can finish resizing after the page is active without firing a resize event, and one at the start and end of every scroll (`scrollStart`, `scrollEnd`) — not on each scroll event, which would flood the buffer. A `clientHeight` or `visualViewportHeight` well below `innerHeight` while `isKeyboardOpen` is false means the page is still laid out for a keyboard that is gone: fixed and sticky elements such as the nav bar are then pinned mid-screen.

## Attaching a log to feedback

Send Feedback has an unchecked **Attach debug log** option with a warning and preview. It captures the existing log
without enabling logging, omits the page URL header, and calls `format()` without Redux state, so no whole-thoughtspace
dump is added. Event entries can still include thought text and device details. The previewed snapshot is what is
submitted; subsequent events are not added automatically. Settings download/copy exports retain their full diagnostic
format. See [Send Feedback](commands.md#send-feedback) and [the service setup](../packages/feedback/README.md).
