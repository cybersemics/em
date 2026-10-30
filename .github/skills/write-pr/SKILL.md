---
name: write-pr
description: >-
  ALWAYS USE THIS SKILL when writing or editing the title or description of a pull request in this repo: opening one with `gh pr create`, filling in a draft, or rewriting the description after the change moved on. Triggers on "open a PR", "create a PR", "write the PR description", "update the PR body", and any request to draft pull request text. Review comments on someone else's pull request belong to `review-pr` instead.
allowed-tools:
  - bash
---

A pull request description is read once, by a reviewer, just before they read the diff. Its job is to tell them what the diff cannot: why the change was needed, what it does to behaviour, and the decisions they would otherwise have to ask about. Everything else is already in the diff, the linked issue, or the CI checks, and repeating it is a cost the reviewer pays before they can start.

So keep it minimal, and make every sentence one the reviewer needs.

## The shape

```markdown
Fixes #1234

<What was wrong or missing, in terms of the code, and what this pull request does about it.>

- <A change, stated as behaviour, and where it lives.>
- <...>
```

Most descriptions are that and nothing more. A one-line fix is the reference and a sentence. A larger change gets more bullets, not more sections.

### The first line

The issue reference, on its own line.

- `Fixes #1234` when merging resolves the issue. GitHub links it in the Development sidebar and closes it on merge.
- The bare `#1234` when the issue stays open, with the relationship in words: `Part of #5481`, or `Refs #5762. This makes the test press what it claims to, but does not fix the flake.` Only close an issue whose Expected Behavior this pull request fully meets.
- `Stacked on #6153. Merge that first.` goes above the reference when another pull request has to land first.

### The opening paragraph

One to three short sentences, usually the cause in one and the change in another. With a linked issue, do not restate its steps or what the user saw, since the reviewer can open it. Say what the issue could not: the cause, named in the code (`useLongPress.stop` defers `onLongPressEnd` by 10 ms), and what this pull request does about it.

Minimal means fewer ideas, not denser sentences. A sentence that chains three clauses with "so" and "rather than" to fit the whole mechanism in is harder to read than the two sentences it replaced. Cut the clause the reviewer does not need.

With no linked issue:

- **A bug a user can see** carries Steps to Reproduce, Current Behavior and Expected Behavior in the description itself, written as [`create-issue`](../create-issue/SKILL.md) says. They go first, and the changes follow them.
- **Anything else** (a refactor, a test, CI, tooling, a skill) opens with the paragraph alone, saying what was wrong or missing and why it matters.

### The bullets

One per change the reviewer should know about, stated as behaviour, with where it lives. They are not a file list, since the Files tab already is one.

- Group by concern, not by file.
- A change that reaches past the issue gets its own bullet. When the fix is in a shared function, name the other callers that now behave differently (a fix in `moveThought` for Indent changes Outdent and drag-and-drop too). That is what the reviewer most needs to check, and the diff does not show it.
- A doc update is one bullet naming the doc and what it now says.
- A test is one bullet naming the behaviour it covers, never a count.

### Sections that earn their place

Add a heading only when the content is a different kind from the bullets and the reviewer would otherwise have to ask. These have each been worth one here:

- **Decisions.** A choice between reasonable options, each with its one-line reason. The maintainer singled out such a section on #5596 because it "anticipated my questions".
- **For review.** A behaviour change you are not sure the maintainer wants, put as a question (#6093).
- **Not changed** or **Not fixed.** What the reviewer would expect this to touch and it does not, and why (#6118, #6083).
- **Verification.** Only what CI cannot show: a reproduction on a real device, a flake's failure rate before and after, a measurement the fix rests on.
- **Before and after screenshots or video** for a visual change. Copy attachment markup across verbatim.

No `Summary` heading over the opening paragraph, no `Changes` heading over the only list, and no `Testing` heading that says tests were added.

### The plan

The [`plan`](../plan/SKILL.md) skill puts its plan in the description, below the issue reference. Its conclusions belong in the body: the approach taken, and the alternative rejected with its reason, as Decisions. Its evidence, the quoted surface area and the adjacent behaviour checklist, goes in one collapsed block at the end, so it is there for a reviewer who wants it and costs nothing for one who does not.

```markdown
<details>
<summary>Plan</summary>

...

</details>
```

The blank line after `</summary>` is required, or a list or fence inside will not render.

## What to cut

Everything that is about your session rather than about the change.

- **Results CI already shows.** "The unit suite passes", "eslint, prettier and tsc are clean", test counts. GitHub renders the checks on the pull request, and prose about them goes stale on the next push.
- **The issue, restated.**
- **The story of the investigation.** What you tried first, how you found the cause. Present findings, not a chronology. A number stays only when it is the evidence for the change ("11 of 40 runs before, 0 of 20 after").
- **Mechanism the diff makes obvious.** "The observer is torn down in a `finally`."
- **Non-events.** "No test changes are needed." "No behaviour change" after you already said the code was unreachable.
- **A section that repeats another.** A reviewer notes section restating the summary, a Docs section restating the docs bullet.
- **Hedges and preambles.** "This PR aims to", "Note that", "It's worth mentioning".

## A before and after

The first description of #6163 ran to about 440 words, under Cause, Design, Docs and Testing headings with a results table. Rewritten:

```markdown
Fixes #5879

`dragAndDropThought` waited only for the drag alert. When a held drag moves on to a second drop target (`skipMouseDown`), that alert is already showing. The helper then returned before the second drop hover rendered, in 11 of 40 local runs before this change and 0 of 20 after.

- Each drop target renders `data-drop-over`, from react-dnd's shallow `isOver`. It is true on a target that rejects the drop too, so a drop that shows no bar still passes.
- The helper records that attribute turning true under the pointer, waits for it once the drag is in progress, and throws if it never does. It records rather than polls because a still pointer fires no `dragover`. A target that a hover moves under the pointer is never hovered, so polling for it would hang.
- It does not wait on `state.hoveringPath`, which is only written when the pointer moves and can still name the previous target.
- The own-position test no longer waits on `.drop-hover` itself, since the helper now does.
- `docs/drag-and-drop.md` describes the attribute and corrects `DropUncle`'s zone to `SubthoughtsDrop`. `docs/testing.md` lists `window.__dropTargetHoverWatch` among the sanctioned exceptions.

Replaces #5882.
```

About 190 words, and nothing the reviewer needs was lost. The before rate stayed because it is the evidence the bug was real, and the after rate because no CI run can show it. The lint and unit-suite results went because CI shows them, the Docs section became one bullet, and the `finally` teardown went because the diff already shows it.

## Title

The behaviour that changes, in sentence case, in the imperative: `Indent: Keep an empty thought at the end of a sorted context`. Lead with the area when the change belongs to one, as an issue title does. For test or tooling work, say what changes for whoever runs it: `Wait for the long-press release to be processed in the longPressThought helper`.

Not a commit-style prefix (`fix(dnd):`), and not the mechanism alone (`Add data-drop-over attribute`).

## TDD

- When the pre-fix control is a commit other than the base, put `/tdd <commit>` at the start of its own line. The TDD workflow reads it from the description, so it has to survive every later edit. See [TDD regression validation](../../../docs/testing.md#tdd-regression-validation).
- Skipping TDD is a label (`skip-tdd`, `skip-tdd-unit`, `skip-tdd-puppeteer`, `skip-tdd-ios`), not text. A `/skip-tdd` line in the description does nothing. When you add one, say in a sentence why a red pre-fix run is not expected.

## Words

- **No em dashes in prose.**
- **No semicolons in prose.** Two sentences, or a comma and a conjunction.
- **Leave commit hashes bare**, with no backticks, so GitHub links them.
- **Use the project's vocabulary.** Resolve an unfamiliar term in [`docs/glossary.md`](../../../docs/glossary.md), and do not invent one.
- **Format the way an issue does.** Backticks for identifiers and paths, `<kbd>` for keys, and arrows for gestures, as in [`create-issue`](../create-issue/SKILL.md).

## Editing a description

The description says what the pull request does now, the way the docs say how the project works now. When the change moves on, rewrite the sentences it made false, and keep the title in step. Do not append an `Update:` section, since the history is already in the commits and the review thread.

Keep the issue reference, any `/tdd` line, and the attribution footer in place through every edit.

On Copilot, the description goes through the `runtime-tools-create_pull_request` tool, as `end-session` says. In a local harness, write the body to a file and pass it with `--body-file`, so the shell does not eat backticks or `$`:

```bash
gh pr create --draft --title "..." --body-file body.md
gh pr edit <number> --body-file body.md
```

## Attribution

End with the attribution line your harness supplies, once. If one is already there, keep it rather than adding a second.

## Before you post

Read it as the reviewer, sentence by sentence, and delete each one they would not miss. Then check:

- The first line is the issue reference, and `Fixes` only where the issue is fully resolved.
- Nothing claims what CI shows.
- Every heading has something under it that the bullets do not already say.
- The title names the behaviour, not the mechanism.

[`end-session`](../end-session/SKILL.md) checks the rest: that the pull request is a draft, carries the plan, and describes what actually landed.

## Escalation

Default to acting on your own. Where the user or a maintainer has asked for particular content in the description, include it, and keep everything else to this skill.
