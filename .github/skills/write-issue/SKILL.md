---
name: write-issue
description: >-
  ALWAYS USE THIS SKILL when creating or editing a GitHub issue in this repo — filing a new bug, splitting one out of a comment thread, or fixing up an issue that is missing reproduction steps. Writes the issue in the project's standard format so the next agent can actually reproduce it.
allowed-tools:
  - bash
---

An issue in this repo is not a note to a human. It is the **input to the [`issue-repro`](../issue-repro/SKILL.md) gate**, which is required to reproduce the reported failure before any agent may read source code, form a theory, or edit a file. That gate keys off three sections by name — "Steps to Reproduce", "Current Behavior", "Expected Behavior". An issue without them cannot be worked; the agent is required to escalate instead of guessing.

So a badly written issue does not merely read poorly. It stalls.

**This has already happened here.** [#2968](https://github.com/cybersemics/em/issues/2968) said the question mark icon "is not centered when width and height are increased". Nobody could tell whether that meant the app font size, the window dimensions, or something else, so the bug could not be reproduced and the issue was closed. The failure was real; the description was not actionable.

## The template

Every issue reporting broken behaviour uses exactly these headings, at `##`, in this order:

```markdown
## Steps to Reproduce



## Current Behavior



## Expected Behavior


```

Match the headings **verbatim** — same words, same order, `##` level. They are parsed by name, and "Steps To Reproduce" or "Actual Behavior" is a heading the gate has to guess at.

### Steps to Reproduce

Numbered, imperative, one action per line, starting from a fresh app. Someone who has never seen the bug must be able to follow them without making a single decision.

Where the bug depends on a particular thought tree, give it as a fenced code block **above** the numbered steps, in the outline format the rest of the repo uses:

````markdown
```
- a
  - =note
    - test
- b
```

1. Set the caret on note `test`.
2. Move Thought Down (Cmd + Shift + ArrowDown).
````

Name settings by the exact label in the UI and give the exact value — "increase the app font size to 32", never "make the font bigger". Ambiguity in a step is what killed #2968.

If a precondition is awkward but load-bearing — a specific device width, a wrapped line, a particular sort order — say so as a step rather than assuming it is obvious.

### Current Behavior

What actually happens, stated as an observation. One or two sentences, then the evidence: a screenshot, a video, a debug log.

Do not put the cause here, and do not put a fix here. This section is what was seen.

### Expected Behavior

What should happen instead. This is the sentence the eventual regression test asserts, so make it assertable — a state the app is or is not in, not a feeling about the design. Where the correct state is visible somewhere else in the app, a screenshot of *that* is worth as much as the screenshot of the bug.

## Beyond the three sections

**A short preamble above the first heading** is fine, and often the right place for what you are unsure about — which platform you tested, whether an unrelated setting seemed causal, what you could not rule out. Better an honest caveat at the top than a confident step that turns out to be wrong.

**`## Notes`** at the bottom carries anything that constrains the fix rather than describing the bug: a tradeoff already understood, an approach known not to work, a reason the obvious fix is wrong.

**`## Debug Log`** carries an attached log file when there is one.

**Split several distinct failures into several issues.** One issue, one reproduction. Where two failures genuinely share a cause and a fix, one issue may carry both — give each its own `#`-level section with its own three subsections, as [#4954](https://github.com/cybersemics/em/issues/4954) does.

## Title

Short, specific, and about the symptom rather than the suspected cause. `Gesture Diagrams misaligned at larger font sizes`, not `GestureDiagram flex-align bug`.

Prefix a platform tag when the bug is platform-specific — `[iOS]`, `[Android]`, `[Mobile]`, `[Desktop]`. **The prefix routes reproduction**: `issue-repro` reads it to decide whether to bring up Chrome or a real iPhone. Omit it when the bug is everywhere; a wrong tag sends the next agent to the wrong device.

Where the issue belongs to a recognisable area, lead with it — `Note:`, `Context View:`, `Command:`.

## Labels

Apply `bug` to anything reporting broken behaviour, `feature` to a request, `refactor` to a behaviour-preserving cleanup, `test` to test and CI work, `agent` to agent configuration and ops. Add `design-needed` when the correct behaviour has not been decided — it is a real state, and saying so is better than inventing an Expected Behavior nobody agreed to.

Leave priority and triage labels (`hold`, `low-priority`, `unable-to-reproduce`, `human`) to the maintainers.

## Evidence

Screenshots and videos are usually already in the conversation that prompted the issue — a comment, a review, a bug report. **Carry the attachment markup across verbatim**, `<img src="https://github.com/user-attachments/...">` and all. Those URLs stay valid across issues. Do not re-upload, do not re-host, and do not describe an image you could have linked.

Attribute what you did not see yourself. If a reporter observed the failure and you are only writing it up, the issue should not read as though you reproduced it.

## Splitting an issue out of a discussion

Most new issues here are born in a comment thread on another issue or PR: something adjacent turns up, and it deserves its own reproduction.

1. **Read the whole thread first.** The decision to split, what exactly is being split off, and often the screenshot all live in comments rather than in the original body.
2. **Take the scope from the thread, not from the original issue.** The point of splitting is that the new issue is a different bug — write it from the evidence in the comment.
3. **Link forward**, from the new issue back to where it came from: `Split out from #2968, which covered the Question Mark icon specifically.`
4. **Link back**, with a comment on the source issue naming the new number: `Opened #5092 to track the general misalignment of Gesture Diagrams at different font sizes.`

Both directions matter. A new issue with no ancestry loses the discussion that produced it; a thread with no forward link leaves the reader assuming the point was dropped.

## How this goes wrong

- **Prose instead of steps.** A paragraph describing the bug reads fine and reproduces nothing. If the reader has to extract the steps, they will extract them differently than you meant.
- **A step with a decision in it.** "Increase the width and height", "make the thought long enough", "set up a table view" — each hands the reader a choice, and the wrong choice makes the bug not appear.
- **Current and Expected merged.** "The icon should be centered but isn't" leaves the gate with nothing to assert. Two sections, two sentences.
- **Cause in place of symptom.** Filing your theory as the issue commits everyone to it. If you have a theory, it is a `## Notes` entry.
- **Screenshot as the whole issue.** An image is evidence for a step, not a substitute for one.

## When you are not sure

Write the issue anyway, with the uncertainty stated in the preamble — an issue that says "tested in Mobile Safari, unknown whether the emulator reproduces it" is far more useful than no issue.

The one thing to escalate rather than invent is **Expected Behavior you are guessing at**. If it is genuinely unclear what the app should do, say so in the section, apply `design-needed`, and let a maintainer decide. Filling it in with a plausible guess produces a regression test asserting behaviour nobody chose.
