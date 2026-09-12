# Debug Log

A rolling record of what **em** did, kept on the device so that a bug nobody can reproduce still leaves evidence behind. It exists for the failures that defeat ordinary debugging: a freeze that takes the console with it, a gesture that misfires once a week, a thought that lands under the wrong parent on someone else's phone and nowhere else.

Implementation: [`src/util/debugLog.ts`](../src/util/debugLog.ts). The bulk of its content comes from [`loggerMiddleware`](../src/redux-middleware/loggerMiddleware.ts), which captures every dispatched action; the rest comes from the editor ([`Editable`](../src/components/Editable.tsx)), gestures ([`MultiGesture`](../src/components/MultiGesture.tsx)), and persistence ([`pushQueue`](../src/redux-enhancers/pushQueue.ts)).

## What it is

A bounded buffer of 5000 entries, sharded across ten rotating `localStorage` keys so appending one entry rewrites 500 entries rather than all of them. Writes are **synchronous**, which is the whole point: an entry survives the freeze that happens on the next line. Nothing is ever transmitted — the log leaves the device only when a person exports it.

Every entry shares an envelope and adds its own fields:

```
[2026-09-12T13:03:39.239Z] +2ms #24 action {"actionType":"indent","payload":"{}"}
 └ wall clock          └ ms since  └ seq  └ type  └ event-specific fields
                         the last
                         entry
```

`seq` is monotonic, so a gap means entries were dropped and a counter climbing while `dt` collapses toward zero means a runaway loop. A `format()` dump appends two things after the entries: `--- lastFrameAt`, the last animation frame the page painted, and `--- state.thoughts`, every thought by id, value, rank and parent. The frame marker is what separates a freeze *in* the app from one below it — if the marker keeps advancing past the last entry, the page was still painting and the hang is at the native layer.

Logging is **off** in production unless the user turns on **Debug Logging** in Settings. It auto-enables on localhost and `*.vercel.app`, excluding test environments (Vitest via `MODE`, Puppeteer via `navigator.webdriver`) and the native Capacitor and Tauri shells, which serve production builds from localhost-like origins. On an auto-enabled host the Settings checkbox switches a device-local opt-out instead of the synced setting, so a preview build can be aligned with production for performance testing without disabling logging on the user's other devices.

## Getting the log off a device

| Who | How |
| --- | --- |
| A person | **Settings → Debug Logging → Download debug log** (or **Share** in the native apps, which have no download manager), or **Copy debug log**. |
| A script or agent | `window.em.debugLog` — `format(state)`, `read()`, `clear()`, `setEnabled()`, `setConsole()`. |
| An agent reproducing a bug | [`scripts/debug-log-capture.ts`](../scripts/debug-log-capture.ts), which attaches through the e2e bridges and writes to a file. |

A reporter attaches the downloaded file to an issue under a `## Debug Log` heading — see [`write-issue`](../.github/skills/write-issue/SKILL.md).

### Streaming to the console

`debugLog.setConsole(true)` mirrors every entry to `console.info` as it is appended, behind a `debugLog` prefix, in the same line format `format()` writes. The choice is recorded in `localStorage`, so it survives the page reloads a reproduction performs — though not `localStorage.clear()`, which takes it along with everything else.

It is **off by default on every host**, including the ones where logging itself auto-enables. The log captures every `selectionchange` and every input event, so mirroring it buries the console for anyone not specifically reading it.

Use it to watch a single interaction live, through a browser MCP's console listing. Do not use it to capture a whole reproduction: four steps of editing produce about 6 KB, and a full buffer approaches a megabyte. Dump the buffer to a file instead.

## Comparing two logs

The reason to capture a log while reproducing a bug is to hold it against the reporter's. The entry where the two stop agreeing is the strongest lead a hard-to-identify bug offers.

`diff` cannot do this. Two runs of the *same* steps share almost no bytes, because every entry carries a fresh sequence number, timestamp and delta, and every thought carries a random 128-bit id:

```
#16 action {"actionType":"newThought","payload":"{\"at\":null,\"value\":\"\"}"}
#20 action {"actionType":"editThought","payload":"{…\"path\":[\"97e810f0…\"]…}"}

#56 action {"actionType":"newThought","payload":"{\"at\":null,\"value\":\"\"}"}
#60 action {"actionType":"editThought","payload":"{…\"path\":[\"94701f3d…\"]…}"}
```

Those are the same two keystrokes. Measured on two live captures of one four-step interaction: `diff` reports **79 of 84 lines changed**.

[`scripts/debug-log-diff.ts`](../scripts/debug-log-diff.ts) compares behaviour instead. Each entry is reduced to a **signature** — its type plus its fields with the volatile parts neutralized — and the two signature streams are aligned by longest common subsequence:

- `seq`, `t` and `dt` are dropped.
- Thought ids are numbered by **first appearance within their own log**, so the nth distinct thought either log creates gets the same placeholder in both. That is what makes two runs of the same steps compare equal.
- Reserved ids ([`HOME_TOKEN`](../src/constants.ts) and the rest, all carrying 24+ leading zeros) are left alone. They mean the same thing on every device, so canonicalizing them would discard the only ids that are directly comparable.
- Per-device nonces and wall-clock stamps — `clientId`, `updatedBy`, `lastUpdated` — are masked, in the plain form and in the escaped form they take inside a stringified payload.
- `session` entries are reported side by side as an environment header rather than compared, since they differ between any two devices by construction.
- `frameGap` entries are dropped by default: they measure how loaded the device was, so a reporter's phone produces many and a headless browser almost none. `--include frameGap` keeps them, which is what a freeze or jank report wants.

Those same two captures compare as **identical**. The report is bounded, so neither log's size reaches the reader.

The procedure an agent follows — download, arm, drive, capture, compare, and how to read the result — is [`compare-debug-log`](../.github/skills/compare-debug-log/SKILL.md), invoked from [`reproduce`](../.github/skills/reproduce/SKILL.md) when an issue carries a log.

## Reading a log

Some shapes worth recognizing:

- **A `push` with no matching `pushSynced`** is a write that never completed. See [Persistence](persistence.md).
- **An `integrity` entry** reports siblings sharing an exact rank, which makes their order ambiguous and is the signature of a data-integrity fault.
- **`move` entries** are diffed out of the thought index rather than logged by any one reducer, so they catch a reorder from every source — drag and drop, sort, undo, remote sync — without special-casing any of them.
- **The log stopping while `lastFrameAt` keeps advancing** means the page was still painting: the hang is below the app.
- **`dt` collapsing toward zero across many entries** is a tight loop.
