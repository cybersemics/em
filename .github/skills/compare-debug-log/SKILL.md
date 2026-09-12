---
name: compare-debug-log
description: >-
  ALWAYS USE THIS SKILL when an issue carries a Debug Log and you are reproducing
  it. Captures the same log locally while you drive the steps, then compares the
  two by behaviour rather than by text and reports where the two runs stopped
  agreeing.
allowed-tools:
  - bash
  - chrome-devtools
  - wdio
---

A reporter's Debug Log is a forensic trace of what **em** actually did on their device. When you reproduce their steps you produce the same kind of trace. The entry where the two stop agreeing is the strongest lead a hard-to-identify bug offers — and on a bug you **cannot** reproduce, it is often the only one.

Comparing them by hand does not work, and neither does `diff`. Every entry carries a sequence number, a wall-clock timestamp, and a millisecond delta, and every thought carries a random 128-bit id, so two runs of the *same* steps share almost no bytes. Measured on this repo: two captures of one four-step interaction differ on **79 of 84 lines** under plain `diff`, and compare as **identical** once the volatile parts are neutralized.

Size is the second problem. Four steps of editing produce ~6 KB of log; a full buffer is 5000 entries and close to a megabyte. A log must never be read into your context — capture it to a file and let the comparison print a bounded report.

## When this runs

From [`reproduce`](../reproduce/SKILL.md) Step 3, whenever the issue has a **`## Debug Log`** section or an attached log file. Skip it when the issue carries no log — there is nothing to compare against.

It does not replace reproduction. Use it to steer one, and to salvage a reproduction that fails.

## Stages

1. **Get their log** — download the attachment to a file. Never paste it into context.
2. **Arm yours** — enable logging and empty the buffer *before* driving the steps.
3. **Drive the steps** — as `reproduce` Step 3 describes, unchanged.
4. **Capture yours** — dump the buffer to a file.
5. **Compare** — run the diff and read the report.

---

## Step 1: Get their log

A `## Debug Log` section normally carries a GitHub attachment. Download it by URL:

```bash
curl -fsSL -o /tmp/em-debug-log-reported.txt '<attachment url>'
```

If the log is pasted inline in the issue body instead, write that block to the same path with a heredoc. Either way it ends up in a file.

Confirm it parsed before going further — a download that returned an HTML error page reports zero entries:

```bash
npx tsx scripts/debug-log-diff.ts /tmp/em-debug-log-reported.txt /tmp/em-debug-log-reported.txt | head -20
```

Comparing the file with itself is a cheap sanity check: it prints the reporter's **environment** and **final state**, and must report no divergence. Read the environment block now rather than later. A log from an app version well behind `main`, or from a platform you are not reproducing on, changes what you do next — and it is a two-line read.

## Step 2: Arm your log

Before the first step of the reproduction:

```bash
npx tsx scripts/debug-log-capture.ts --start                  # web / android
npx tsx scripts/debug-log-capture.ts --start --target ios     # ios
```

This enables logging and empties the buffer, so what you capture afterwards is the reproduction and nothing before it. It is required on iOS and Android — logging auto-enables only on localhost and Vercel preview hosts, and the Capacitor shells are neither.

**Re-run it after anything that clears app state.** `resetApp` and `localStorage.clear()` wipe the buffer *and* the console-mirror preference along with everything else.

Add `--console` to also mirror every entry to the console as it is appended, which lets you watch a single interaction live through `list_console_messages`. Do that to answer "what happened when I tapped that?" — not to capture a whole reproduction, which would flood the listing and your context.

## Step 3: Drive the steps

Exactly as [`reproduce`](../reproduce/SKILL.md) Step 3 says. Nothing about the reproduction changes because a log is being captured.

## Step 4: Capture your log

```bash
npx tsx scripts/debug-log-capture.ts --out /tmp/em-debug-log-local.txt
npx tsx scripts/debug-log-capture.ts --out /tmp/em-debug-log-local.txt --target ios
```

It prints one line — entry count, size, path. If it reports **0 entries**, logging was not armed (Step 2) or app state was cleared after arming.

## Step 5: Compare

```bash
npx tsx scripts/debug-log-diff.ts /tmp/em-debug-log-reported.txt /tmp/em-debug-log-local.txt
```

The first argument is always **theirs**, the second **yours**. In the report, `-` is the reporter's log and `+` is your capture.

Read the report in this order — the cheap sections often answer the question before the diff does.

1. **Environment.** Platform, app version, commit hash, screen size. A divergence explained by "they are three versions behind" needs no further analysis.
2. **Entry types in only one log.** Frequently the whole answer. `composition` entries in theirs and none in yours means an IME was involved. `move` in theirs and none in yours means a reorder your run never performed.
3. **First divergence.** The entry where the two streams stop agreeing, with matching context above it.
4. **The alignment that follows it.** Later divergences, in case the first is incidental.

### Reading a divergence honestly

The first divergence is the first place the streams differ, which is not always the *interesting* place. Two things commonly land ahead of the real one:

- **Asynchronous initialization.** `initThoughts` and the `push`/`pushSynced` pairs land at slightly different points relative to user input on every run. A `+`/`-` pair around them is ordering variance, not behaviour.
- **A step you drove differently.** If your capture is missing a command the reporter's log shows, you did not follow their steps — fix the reproduction before drawing conclusions from the diff.

When the head of the report is noise, narrow the window and look again rather than reading past it:

| Option | Use it for |
| --- | --- |
| `--tail <n>` | Compare only the last n entries. The fastest way to focus on the moment of failure. |
| `--anchor <type>` | Start at the last entry of a type. Defaults to `session`, so a reporter's log covering several app launches is compared from the last one. |
| `--no-anchor` | Compare from the top, when the bug predates the last launch in their log. |
| `--ignore <types>` | Drop noisy entry types, e.g. `--ignore frameGap,selectionchange,lifecycle`. |
| `--include frameGap` | Keep the frame-gap entries that are dropped by default — they are the signal for a freeze or jank report. |
| `--mask <fields>` | Mask another field that differs by construction between devices. |
| `--context`, `--max-lines` | Widen or tighten how much of the alignment is printed. |

### What a result means

- **No divergence.** You reproduced their run faithfully — so if the symptom did not appear for you, the cause is *outside* the action stream: their data, their settings, their platform, their timing. Say so explicitly; it is a real finding, and it narrows the search more than another reproduction attempt would.
- **A divergence.** Read it as the first place your run stopped following theirs. It is evidence about where to look, not a diagnosis — confirm the mechanism in the source before you call it the cause.
- **Types present only in theirs.** The strongest single signal in the report. Whatever produces those entries is involved.

Quote the divergence — the entries themselves — when you report what you found, the same way `reproduce` Step 3 asks you to quote what you observed.

---

## When you cannot reproduce at all

`reproduce` escalates when the failure will not occur. Run this skill **before** escalating anyway: capture your failed attempt and compare it against theirs. "Their log shows four `composition` entries that mine never produced" turns a dead end into a question the user can answer, and that is a far better escalation than "could not reproduce."

## Escalation

- A log that parses to zero entries is not a debug log. Re-download it, and if it still will not parse, ask the reporter for a fresh one rather than guessing at the format.
- Do not conclude from a divergence alone. It says where the runs parted, not why. The cause still has to be found in the source and proven by a test, per `reproduce` Steps 4–6.
