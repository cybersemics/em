---
name: create-issue
description: >-
  ALWAYS USE THIS SKILL when creating or editing a GitHub issue in this repo — filing a new bug, splitting one out of a comment thread, adding reproduction steps to an issue that lacks them, or marking one blocked by another. Triggers on "create issue", "write issue", "file an issue", "open an issue", "make an issue", "report a bug", and any request to draft or edit issue text.
allowed-tools:
  - bash
---

Issues reporting broken behaviour in this repo follow a fixed format.

## Ask before posting

The issue is read by someone who cannot ask you anything. Every gap in it becomes a question in a comment thread, or a guess by whoever picks it up.

So put your open questions to the reporter first, and post once the answers are in. Ask about anything whose answer changes what the issue says:

- A step you would otherwise have to guess at — which setting, which value, which platform, what the thought tree was.
- Whether what you are describing is one bug or two.
- Expected Behavior, where the correct behaviour is a decision rather than an observation.
- Evidence you believe exists and do not have — a screenshot, a video, a debug log.

Ask them in one pass rather than one at a time, and only where the answer is the reporter's to give: a question you can settle by reproducing the bug or by reading the code is yours to settle.

What you post is then succinct and free of loose ends — no "possibly", no "I think this is related to", no alternative left unruled-out. Where an answer genuinely cannot be had, name it as a known unknown in the preamble rather than leaving it implied.

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

What happens, as an observation, with the evidence: a screenshot, a video, or a debug log. Not the cause, and not a proposed fix. Quote a one-line error inline rather than in a fenced block; keep fences for output that actually spans lines.

### Expected Behavior

What should happen instead. Write it as a condition that can be checked — a state the app is or is not in — since it is what a regression test will assert. Where the correct state is visible elsewhere in the app, a screenshot of that is useful alongside the screenshot of the bug.

State the goal, not the shape of the fix. What the fix looks like is the assignee's call, and writing it out for them in advance is work they will redo.

## Optional sections

- **A short preamble above the first heading**, for what you are unsure about: which platform you tested, whether an unrelated setting seemed causal, what you could not rule out.
- **`## Notes`** at the bottom, for anything that constrains the fix rather than describing the bug — a tradeoff already understood, an approach known not to work, a reason the obvious fix is wrong.
- **`## Debug Log`**, for an attached log file.

One issue per reproduction. Where two failures share a cause and a fix, a single issue may carry both, each under its own `#` heading with its own three subsections — see [#4954](https://github.com/cybersemics/em/issues/4954).

## Length

Say the thing and stop. An issue is a report, not a write-up — the reader needs to know what is broken and what should happen instead, and every sentence past that is one they read before they can start.

Word count is not the measure — a bug needing eight steps gets eight steps. What gets cut is the writing that is about your investigation rather than about the bug.

## Title

Describe the symptom rather than the suspected cause: `Gesture Diagrams misaligned at larger font sizes`, not `GestureDiagram flex-align bug`.

Prefix a platform tag when the bug is platform-specific — `[iOS]`, `[Android]`, `[Mobile]`, `[Desktop]`. Omit it when the bug occurs everywhere.

Lead with the area where the issue belongs to one — `Note:`, `Context View:`, `Command:`.

## Labels

`bug` for broken behaviour, `feature` for a request, `refactor` for a behaviour-preserving cleanup, `test` for test and CI work, `agent` for agent configuration and ops.

Add `design-needed` when the correct behaviour has not been decided.

Leave priority and triage labels — `hold`, `low-priority`, `unable-to-reproduce`, `human` — to the maintainers.

## Blocked by

"Blocked by" is a GitHub relationship, not a line of body text. `Blocked by #5228` in the body renders as a plain reference: the issue is not marked blocked, it does not show as blocked in issue lists or projects, and #5228 does not show what it is holding up.

Set the relationship with `gh`, at creation or after:

```bash
gh issue create --title "..." --body-file body.md --blocked-by 5228
```

```bash
gh issue edit 5226 --add-blocked-by 5228
```

Both take a comma-separated list of issue numbers or issue URLs; `--remove-blocked-by` undoes it. Configure it from the blocked issue only — GitHub records the inverse itself, and #5228 lists #5226 under Blocking. Where the new issue is the prerequisite rather than the dependent, `--blocking` and `--add-blocking` are the same thing pointed the other way.

The blocker must be an issue. A pull request number is refused: `gh` cannot resolve it — `Could not resolve to an Issue with the number of 5085` — and the REST endpoint refuses the pull request's own database id with `Target issue may only be an issue`. Where the prerequisite is a pull request, block on the issue that pull request implements and name the pull request in the `## Notes` bullet, as [#5236](https://github.com/cybersemics/em/issues/5236) does with #4400 and #5085. If no such issue exists, open one for what the pull request delivers, let the pull request close it, and block on that.

Verify it landed, since a body reference and a relationship look alike once rendered:

```bash
gh issue view 5226 --repo cybersemics/em --json blockedBy
```

Prefer `gh` to the REST endpoint, `POST /repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by`, which takes `issue_id` — the blocker's numeric database id, from `gh api repos/cybersemics/em/issues/5228 --jq .id` — rather than its issue number.

Keep a `## Notes` bullet beside the relationship where the reason is not obvious from the two titles. The relationship carries the fact; only the note carries the why. [#5226](https://github.com/cybersemics/em/issues/5226):

> Blocked by #5228, which makes Select All toggle to Deselect All on desktop as well as touch. The third step is that toggle, so it has to exist first.

`- [ ] Blocked by #5228` is not a substitute. Nothing tracks a checkbox.

## Evidence

Screenshots and videos are usually already in the conversation that prompted the issue. Copy the attachment markup across verbatim, `<img src="https://github.com/user-attachments/...">` and all; those URLs stay valid in another issue. Do not re-upload or re-host, and do not describe an image you could link.

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
- A theory about the cause in place of the symptom.
- An Expected Behavior that specifies the fix rather than naming the goal.
- A paragraph of preamble establishing what you did and did not reproduce, where a clause would do.
- A screenshot with no steps.
- A `Blocked by` line in the body with no relationship configured on GitHub.
- A loose end left for the reader — an unruled-out alternative, a missing value, an unnamed platform — that the reporter could have answered before posting.

## When something is unknown

Ask, as above. State whatever survives the answers in the preamble rather than omitting the issue.

Do not guess Expected Behavior. Apply `design-needed` and leave the decision to a maintainer, since a guess there becomes a regression test asserting behaviour nobody chose.
