---
name: write-issue
description: >-
  ALWAYS USE THIS SKILL when creating or editing a GitHub issue in this repo — filing a new bug, splitting one out of a comment thread, or adding reproduction steps to an issue that lacks them.
allowed-tools:
  - bash
---

Issues reporting broken behaviour in this repo follow a fixed format.

## The template

Exactly these headings, at `##`, in this order:

```markdown
## Steps to Reproduce



## Current Behavior



## Expected Behavior


```

### Steps to Reproduce

Numbered, imperative, one action per line, starting from a fresh app. Name settings by their exact label in the UI and give the exact value — "Increase the app font size to 32", not "make the font bigger". A step that leaves the reader a choice will be followed differently than it was meant.

[#2968](https://github.com/cybersemics/em/issues/2968) was closed unreproduced because its only step was "when width and height are increased", which could have meant the app font size, the window dimensions, or the icon's own dimensions.

Where the bug depends on a particular thought tree, give it as a fenced code block above the numbered steps, in outline format:

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

Include preconditions that are awkward but load-bearing — a specific device width, a wrapped line, a particular sort order — as steps rather than assuming they are obvious.

### Current Behavior

What happens, as an observation, with the evidence: a screenshot, a video, or a debug log. Not the cause, and not a proposed fix.

### Expected Behavior

What should happen instead. Write it as a condition that can be checked — a state the app is or is not in — since it is what a regression test will assert. Where the correct state is visible elsewhere in the app, a screenshot of that is useful alongside the screenshot of the bug.

## Optional sections

- **A short preamble above the first heading**, for what you are unsure about: which platform you tested, whether an unrelated setting seemed causal, what you could not rule out.
- **`## Notes`** at the bottom, for anything that constrains the fix rather than describing the bug — a tradeoff already understood, an approach known not to work, a reason the obvious fix is wrong.
- **`## Debug Log`**, for an attached log file.

One issue per reproduction. Where two failures share a cause and a fix, a single issue may carry both, each under its own `#` heading with its own three subsections — see [#4954](https://github.com/cybersemics/em/issues/4954).

## Title

Describe the symptom rather than the suspected cause: `Gesture Diagrams misaligned at larger font sizes`, not `GestureDiagram flex-align bug`.

Prefix a platform tag when the bug is platform-specific — `[iOS]`, `[Android]`, `[Mobile]`, `[Desktop]`. Omit it when the bug occurs everywhere.

Lead with the area where the issue belongs to one — `Note:`, `Context View:`, `Command:`.

## Labels

`bug` for broken behaviour, `feature` for a request, `refactor` for a behaviour-preserving cleanup, `test` for test and CI work, `agent` for agent configuration and ops.

Add `design-needed` when the correct behaviour has not been decided.

Leave priority and triage labels — `hold`, `low-priority`, `unable-to-reproduce`, `human` — to the maintainers.

## Evidence

Screenshots and videos are usually already in the conversation that prompted the issue. Copy the attachment markup across verbatim, `<img src="https://github.com/user-attachments/...">` and all; those URLs stay valid in another issue. Do not re-upload or re-host, and do not describe an image you could link.

Attribute observations you did not make. An issue written up from someone else's report should not read as though you reproduced it.

## Splitting an issue out of a discussion

New issues often originate in a comment thread on another issue or PR.

1. Read the whole thread. The decision to split, the scope of what is being split off, and often the screenshot are in comments rather than in the original body.
2. Take the scope from the thread, not from the original issue.
3. Link forward, from the new issue to its origin: `Split out from #2968, which covered the Question Mark icon specifically.`
4. Link back, with a comment on the source issue naming the new number: `Opened #5092 to track the general misalignment of Gesture Diagrams at different font sizes.`

## Common defects

- Prose instead of numbered steps.
- A step containing a decision — "increase the width and height", "make the thought long enough", "set up a table view".
- Current and Expected merged into one sentence, leaving nothing to assert.
- A theory about the cause in place of the symptom. A theory belongs in `## Notes`.
- A screenshot with no steps.

## When the correct behaviour is unknown

State the uncertainty in the preamble rather than omitting the issue.

The exception is Expected Behavior: do not guess it. Apply `design-needed` and leave the decision to a maintainer, since a guess there becomes a regression test asserting behaviour nobody chose.
