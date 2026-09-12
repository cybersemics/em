# Debug Log

**em** has a console like any other web app, and for the bugs that matter most it is out of reach. A freeze on someone's phone produces no console output anyone can read; a tab that dies takes its console buffer with it; a user reporting "it locked up yesterday" has nothing to hand over at all. The rolling debug log ([`util/debugLog.ts`](../src/util/debugLog.ts)) exists for that class of bug — catastrophic, rare, and happening on a device nobody can attach a debugger to.

That purpose settles every other decision in the module. The log is **bounded**, because it runs for the whole of an ordinary session and cannot be allowed to grow without limit. It is **synchronous**, because an entry deferred to a microtask or an idle callback is an entry lost to the freeze immediately after it — the last line in a log has to be the last thing that actually ran. It is **persisted to `localStorage`**, because the evidence has to outlive the page: a reload, a force-quit, a device restart. And it is **silent and free when disabled**, because instrumentation that can itself degrade the app is instrumentation nobody dares leave switched on.

It is not a replacement for the console. Nothing here is meant to be read live at a desk, where `console.info` and the Redux devtools are better at everything. It is a black-box recorder, read after the fact, from a text file someone emailed you.

## The rolling buffer

The in-memory `entries` array is the source of truth; the persisted chunks are a write-only mirror of it, read back only at module load by `hydrate()`. That keeps `log()` off the parse path — appending an entry deserializes nothing.

Capacity is 5000 entries (`CHUNK_SIZE` 500 × `CHUNK_COUNT` 10). Past that, `log()` splices the oldest entries off the front, so **a log is always a tail, never a recording of the session**. That matters when you read one: on a long session the opening minutes are gone, along with the `session` marker that opens every log, the initialization actions, and whatever the user did before the thing you are investigating. What you have is the last 5000 events before the log was captured — which, for a freeze, is exactly the window worth having, and for a bug whose cause was twenty minutes of activity earlier, is not.

Individual fields are capped at 2000 characters (`FIELD_MAX_LENGTH`) and rendered with a `…(+N)` suffix naming how much was cut. One pathological value — a pasted document, a serialized action carrying a whole subtree — could otherwise exhaust the ~5MB `localStorage` quota on its own.

## Chunked persistence

Entries are sharded across ten numbered keys, `debugLog-0` through `debugLog-9`. An entry belongs to the chunk `floor(seq / 500) % 10`, so writing entry 1400 rewrites `debugLog-2` and leaves the other nine keys untouched.

The reason is the cost of the write, not the cost of the space. `persist()` runs synchronously inside `log()`, on the main thread, on every entry. Serializing and writing the whole 5000-entry buffer each time would make the logger a measurable drag on exactly the pathological, high-frequency event streams it is there to capture — and a logger that changes the app's timing is a logger that can hide or invent the bug. Serializing at most 500 entries keeps that bounded.

Chunk ordinals wrap, so the eleventh chunk reuses `debugLog-0` and thereby evicts the oldest persisted entries, keeping the mirror in step with the in-memory trim.

If `setItem` throws — almost always the quota — `persist()` deletes every *other* chunk key plus the legacy key and retries once. The newest entries are the relevant ones, so the fallback sacrifices history to keep the present. If the retry throws too, it gives up silently.

## Hydration

At module load, `hydrate()` reads all ten chunk keys, flattens them, sorts by `seq`, and trims to capacity. This is what lets a prior session's log survive: the tab that froze wrote its last entry synchronously before it stopped responding, and the next load picks it up. The sequence counter resumes from the last hydrated entry rather than resetting, and the active chunk is primed with whatever tail of the hydrated buffer belongs to the current ordinal, so a resumed session appends to the partially-filled chunk on disk instead of clobbering it.

`hydrate()` also reads `debugLog`, the unchunked single key used before sharding, dropping any entry whose `seq` already appears in a chunk. A device that has not run em since that version still has a log worth recovering.

Because hydration is indiscriminate about *when* the entries were written, **a log can span an app update**: entries from the build that crashed, hydrated into a session running a newer build. The environment header describes the build that formatted the log, not necessarily the one that wrote its oldest entries — a `session` marker still in the buffer will name that one.

## The frame heartbeat

While logging is enabled, a `requestAnimationFrame` loop runs. It does two different things, and the distinction is the whole point.

It writes a **frame marker** — `debugLog-frame`, holding a single `Date.now()` timestamp, overwritten in place and throttled to once every 500 ms. In place, because a healthy 60 Hz cadence carries no information per frame; appended as entries it would fill the whole 5000-entry buffer with heartbeats in under ninety seconds of idling, evicting every real event.

Separately, it appends a **`frameGap` entry** when consecutive frames are more than 500 ms apart. An anomalous gap is the one thing about the frame cadence that *is* worth a line in the log: jank, a GC pause, the tab being suspended by the OS.

Together they tell you where a freeze lives, which is otherwise very hard to establish from a device you cannot inspect:

- **The log stops and the marker is stale.** `requestAnimationFrame` never fired again, so JavaScript never yielded — a synchronous loop inside the app froze the tab.
- **The marker keeps advancing past the last event.** The frame loop is still running and the app is still scheduling work, so the hang is below em: the WebView, the native shell, the compositor.

## Enabling it

In production, logging follows the `debugCrashLog` user setting, which lives in the thoughtspace under `EM/Settings` and therefore **syncs across a user's devices**. [`AppComponent`](../src/components/AppComponent.tsx) mirrors it into the logger from a single always-mounted effect, which is the only coupling between the logger and Redux — `debugLog` itself imports no store.

On development and preview hosts, logging is on by default. `autoEnabled` is computed once at module load and is true for `localhost`, loopback addresses, and `*.vercel.app` preview deployments over `http`/`https`. It deliberately excludes:

- **The test environments**, which also run on localhost — Vitest via `import.meta.env.MODE`, Puppeteer via `navigator.webdriver`. Tests keep explicit `setEnabled` semantics and, more importantly, production timing; a logger silently active under every e2e run would change what the suite measures.
- **The native Capacitor and Tauri shells**, which serve production builds from localhost-*like* origins (`capacitor://localhost`, `https://localhost`, `tauri://localhost`) and would otherwise be mistaken for a dev server.

Auto-enable is applied at module load, before `AppComponent` mounts, so initialization is captured rather than beginning at the first render.

A device on an auto-enable host can opt out, recorded in `localStorage` under `debugLogOptOut`. It is device-local by design: the point is to align *this* device with production — for performance testing, say — without touching the synced setting and switching logging off on the user's phone. `clear()` deliberately leaves the key alone, since it is a preference rather than log data. And `setAutoOptOut` is a no-op when `autoEnabled` is false, so the opt-out can never suppress the synced setting in production; the checkbox in Settings only controls the opt-out on hosts where it means something.

## Getting a log off the device

The `DebugLogging` component in [`modals/Settings.tsx`](../src/components/modals/Settings.tsx) is the entire user-facing surface: the Debug Logging setting, and, once logging is on, links to save, copy, and clear the log.

Saving is labelled **Download debug log** in browsers and **Share debug log** in the native apps, because a native WebView has no download manager — the anchor click that `download()` performs is silently ignored there, so the native share sheet is the only route off the device, as in the Export modal. Mobile browsers are unaffected.

Both saving and copying go through a dispatched thunk rather than calling `format()` directly, so they read fresh state and can append the `state.thoughts` dump.

## Reading a log

A formatted log has four parts:

```
--- device: iPhone (ios), 390x844, touch
--- userAgent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) …
--- version: 351.2.0
--- commit: a1b2c3d
[2026-09-12T15:04:01.221Z] +12ms #4831 input {"branch":"retarget","inputType":"insertText",…}
[2026-09-12T15:04:01.233Z] +12ms #4832 retarget {"step":"asyncFocus","savedOffset":7,"deferred":true}
--- lastFrameAt: 2026-09-12T15:04:01.402Z
--- state.thoughts: 214 thoughts, 190 lexemes
4f9c1ae2b70d48f1a3e65c08d21b7fa9 "Animals" rank:0 parent:00000000000000000000000000000001
```

**The environment header** names the device, user agent, em version, and build commit. It is rendered at format time rather than read back from the `session` entry precisely because the buffer evicts that entry on long sessions — the logs most worth reading would otherwise be the ones that could not tell you what they came from. The device line is the navigator platform, the shell (`web`, `ios`, `android`, or `tauri`), the screen dimensions, and the pointer type. The shell is worth naming separately because it is not recoverable from the user agent: a Capacitor WebView shares its user agent with the mobile browser it embeds, and Tauri reports the web platform to Capacitor, so only the flag Tauri's runtime injects distinguishes the desktop app from a browser.

**Each entry is one line**, with a common envelope of `seq`, `t`, `dt`, and `type` followed by event-specific fields as JSON. `t` is wall-clock (`Date.now()`), so entries stay readable after a device restart; `dt` is high-resolution milliseconds since the previous entry.

**The trailing `lastFrameAt`** is the frame marker, read at format time — see [the frame heartbeat](#the-frame-heartbeat).

**The `state.thoughts` dump** is appended when `format()` is given state. Entries carry `ThoughtId`s, not values, so without it half the log is unreadable; the dump resolves each id to its value and shows current sibling order, one line per thought, grouped by parent and ordered by rank.

### What the shape of a log tells you

- **`dt` collapsing toward zero** across a run of entries is a tight loop — the app dispatching or re-rendering as fast as it can. The `type` that repeats names the loop.
- **A jump in `seq` between adjacent lines** means entries were *lost*, not evicted. Eviction only ever removes the oldest, so it shortens a log from the front without breaking the run; a gap in the middle means a chunk went missing — most likely the quota fallback discarding the others.
- **A `push` with no matching `pushSynced` or `pushError`** is a write that never completed, which is the signature of data that did not survive the session. See [persistence.md → Push queue](persistence.md#push-queue-redux--treecrdt).
- **The last entry before the log goes silent** names the last thing that ran. This is the whole reason entries are written synchronously: for the `retarget` steps around the native focus and selection calls in [`Editable`](../src/components/Editable.tsx), the last one logged is the call that stopped returning.
- **An `integrity` entry** is a data fault the app tolerated rather than a crash, and it is worth reporting even when it is not what you were looking for.

## Entry types

Types are plain strings passed to `debugLog.log()`; there is no registry. This is what is emitted today, and it is the map from an entry back to the code that wrote it.

| Type | Emitted by | Records |
| --- | --- | --- |
| `session` | [`debugLog.ts`](../src/util/debugLog.ts) | Written once when logging is enabled: user agent, screen, Vite mode, em version, build commit |
| `frameGap` | [`debugLog.ts`](../src/util/debugLog.ts) | Consecutive animation frames more than 500 ms apart |
| `action` | [`loggerMiddleware.ts`](../src/redux-middleware/loggerMiddleware.ts) | Every dispatched action. `updateThoughts` gets a structured summary (per-thought id/value/rank/parent, counts, local/remote); everything else gets its stringified payload |
| `move` / `moveBatch` | [`loggerMiddleware.ts`](../src/redux-middleware/loggerMiddleware.ts) | Each thought whose rank or parent changed, diffed from the thoughtIndex so every source is caught; beyond ten moves in one action, a single `moveBatch` with a sample |
| `integrity` | [`loggerMiddleware.ts`](../src/redux-middleware/loggerMiddleware.ts) | Siblings sharing an exact rank, which makes their order ambiguous. Warned once per parent and rank |
| `undo` / `redo` | [`loggerMiddleware.ts`](../src/redux-middleware/loggerMiddleware.ts) | Which original action types were reverted or replayed, so a move restored by undo is distinguishable from a fresh one |
| `command` | [`commands.ts`](../src/commands.ts) | Command id and how it was triggered (keyboard, gesture, toolbar) |
| `push` / `pushSynced` / `pushError` | [`pushQueue.ts`](../src/redux-enhancers/pushQueue.ts) | Each push-queue flush and its outcome. See [persistence.md](persistence.md#push-queue-redux--treecrdt) |
| `drop` | [`useDragAndDropThought`](../src/hooks/useDragAndDropThought.tsx), [`useDragAndDropSubThought`](../src/hooks/useDragAndDropSubThought.tsx) | The drop target and dragged items, attributing the moves that follow — drops run no command, so they leave no `command` entry |
| `longPressEnd` | [`useDragHold.ts`](../src/hooks/useDragHold.ts) | How a press ended, distinguishing a deliberate `touchend` from a system-claimed `touchcancel` |
| `touchstart` / `touchend` / `swipe` / `gesture` / `gestureCancel` | [`MultiGesture.tsx`](../src/components/MultiGesture.tsx) | Raw touch coordinates and the recognized gesture sequence, plus the viewport height and safe-area inset that decide the bottom system-gesture exclusion |
| `lifecycle` | [`initEvents.ts`](../src/util/initEvents.ts) | Page lifecycle transitions, so events can be correlated with the app being backgrounded — more direct than inferring suspension from gaps in the timeline |
| `edit` / `change` / `tap` / `guard` | [`Editable.tsx`](../src/components/Editable.tsx) | The value transition at the point an edit commits, the branch of the change handler that ran, the inputs that decide a tap's branch, and suppression guards that fired |
| `input` / `beforeinput` / `keydown` / `composition` / `focus` / `blur` / `selectionchange` / `retarget` | [`Editable.tsx`](../src/components/Editable.tsx) | The raw native event stream around iOS autocomplete, which React's synthetic `onChange` does not fully expose. Registered only on touch Safari, so they add no surface area elsewhere |

## Invariants

These are the constraints any change to the logger has to preserve. They are load-bearing, not stylistic, and the tests in [`util/__tests__/debugLog.ts`](../src/util/__tests__/debugLog.ts) pin all three.

**It never throws.** Every entry point — `log()`, `persist()`, `hydrate()`, `format()`, `clear()`, the frame marker write, the opt-out read and write — swallows its own errors. The logger is called from the middle of editing, gesture handling, and the push queue, on code paths already going wrong. Instrumentation that can turn a freeze into a crash, or break editing on a device with a full quota, is worse than no instrumentation.

**It is a no-op with zero cost when disabled.** `log()` returns on the first line if `enabled` is false, before building the entry, so the call sites scattered across `Editable`, `MultiGesture`, and the middleware cost one boolean check each in production. `loggerMiddleware` additionally guards the expensive part — it only snapshots pre-reduction state for the move diff when logging is on.

**It writes synchronously.** `persist()` is called inside `log()`, not batched, debounced, or deferred to an idle callback. Every optimization that would make it asynchronous also loses the final entries of a freeze, which are the only ones that matter.
