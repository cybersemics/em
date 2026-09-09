---
name: review-pr
description: >-
  ALWAYS USE THIS SKILL when writing review feedback on a pull request in this repo: posting a review, leaving inline comments, or revising ones already posted.
allowed-tools:
  - bash
---

A review is read by someone who is going to act on it, not study it. Every sentence they read before they can start is a cost, and a paragraph of justification is a paragraph they have to translate back into a change.

Finding the problem is the hard part and it is already done by the time you write. The writing is not where the work shows.

## Where feedback goes

Anything anchored to a line, a function, or a module goes in an **inline comment** on that line. General and architectural feedback goes in the **summary comment**.

An inline comment can only anchor to a line in the diff. A finding in a file the pull request does not touch has no anchor and belongs in the summary.

## An inline comment

One or two sentences. Observation, then consequence, joined by "so".

> `beginCommand` is dispatched outside the `try`, so a throw downstream leaves the frame on the stack and every later action merges into the failed command.

Add the recommended action as a second sentence when the fix is not obvious from the defect.

> Throwing from a reducer, reached from a `finally`, replaces the command's real error and reaches the user as a raw string. Log and return instead.

Leave it out when it is. "This returns a label but the callers still `startCase` it" already says what to do.

State the action in the imperative: *Skip it like the others*, *Use `generateThought` instead*, *Rewrite this as a dispatchable thunk*. Not "should be considered" or "it would be better to".

### What to cut

Everything that is about your investigation rather than about the code.

- **Evidence.** You ran the probe, you measured the dispatches, you re-ran it on both branches. None of that goes in the prose. It goes in a details block below it, or nowhere. A number stays in the prose only when the number *is* the finding: "boundaries are around 40% of dispatches during a multiselect command".
- **Mechanism you traced but the author already knows.** They wrote the code.
- **Hedges and preambles.** "For what it's worth", "Note that", "It's worth flagging".
- **Restating the consequence twice**, once concretely and once as a principle.

A real before and after from a single finding:

> `hasPatch` looks fully subsumed by `continuesCommand`. Both write sites pair `hasPatch = true` with writing the newest patch under `activeCommandMetadata` and setting `lastAction`, which is exactly what `continuesCommand` tests. I ran the enhancer over 20k randomized sequences: `hasPatch && !continuesCommand` came up zero times, and a variant with the field and both reset loops removed produces byte-identical stacks and passes the suite…

became

> `hasPatch` is covered by `continuesCommand`, so you should be able to remove the `hasPatch`.

114 words to 14. Nothing actionable was lost, and the 100 words that were cut are what the details block is for.

## The details block

GitHub renders `<details>` in every comment, so the evidence can be there without being read. The finding stays one or two sentences; everything you would have had to delete goes underneath it, collapsed.

```markdown
<details>
<summary>Evidence</summary>

20k randomized sequences through the enhancer: `hasPatch && !continuesCommand` came up zero
times. A variant with the field and both reset loops removed produces byte-identical stacks
and passes the suite.

</details>
```

The blank line after `</summary>` is required, or a fenced block or list inside will not render.

Put it at the end of the comment, after the finding and any recommended action. One block per comment, headed `Evidence`. What earns a place in it:

- **Measurements.** Counts, timings, sample sizes, the numbers you compared.
- **Reproduction.** The command, the sequence of steps, the branch each was run on.
- **The reasoning that ruled out the alternative.** Why it is not the other thing you suspected first.
- **Raw output** where the shape of it is the point: a stack, a diff, a failing assertion.

What still gets deleted rather than collapsed, because collapsing it only moves the cost:

- Hedges, preambles, and restatements of the consequence.
- Mechanism the author already knows.
- The narrative of how you got there. Present the evidence as findings, not as a chronology of what you tried.

A finding whose whole support is "I read the code and it looks subsumed" has no block. An empty or padded `Evidence` teaches the author to stop opening them.

## The summary comment

Open with one line. "Thanks for the update. It's getting close." A recap of what the author did is a recap they do not need.

Give an architectural ask as an instruction and, where a shape is easier shown than described, a snippet of the call you want:

> Rewrite `withCommandDispatch` as a thunk-like function that can be dispatched. That is a more familiar pattern in this codebase.
>
> ```ts
> dispatch(commandTransaction(metadata, operation))
> ```

One reason, at most. The argument that convinced you is longer than the one that will convince them.

Do not promise what the next round will contain. "This is the last structural change" is not yours to promise, and a later round that finds more makes it a broken one.

Do not attribute a concern to the author that they have not raised. Answering an objection nobody made invents a disagreement.

Close with what is **out of scope**, as bare bullets: issues split out, preexisting behavior you are not asking them to change, work already tracked elsewhere.

## Words

- **No em dashes in prose.**
- **No semicolons in prose.** Two sentences, or a comma and a conjunction.
- **No invented terms.** Every one of these was rewritten: "re-announce" became "open another one", "the recorded value" became "the patch should store undefined", "pinned by #5433" became "now covered by #5433". If a phrase is not in [`docs/glossary.md`](../../../docs/glossary.md) or plain English, it is jargon.
- **Use the project's vocabulary.** em has thoughts and a thoughtspace. It has no documents. Resolve an unfamiliar term in the glossary before using it, including in a review.

## Revising a comment

Fold a clarification into the original comment and delete the reply. A thread where the second message explains the first is a first message that did not work, and the author reads both.

## Covering behavior with a test

Where a finding is about behavior `main` already has, a test that passes on `main` and fails on the branch says more than a paragraph. Open it as its own pull request against `main`, then reference it from the comment it covers:

> Dropping this guard leaves a zero-operation patch on the redo stack, so Redo stays enabled and does nothing. Now covered by #5434.

Verify both halves before referencing it: it must pass on `main` and fail on the branch, and the failure must be the behavior it claims, not an import error or a crash. A test that fails for an incidental reason is worse than none, because it gets read as a contract.

Findings about behavior the branch introduces have nothing to pin on `main`. Say so rather than stretching for a test.

## Cut before you post

Not every verified finding earns a place. Rank them, and drop the tail. Ten comments the author works through beat fifteen they skim.

## Common defects

- A comment that explains the problem and never says what should happen instead.
- A paragraph where a sentence does.
- Evidence from your investigation left in the prose instead of collapsed below it.
- A reply thread clarifying a comment that should have been edited.
- An invented term, or a term the glossary does not define.
- Justification stacked three deep for a one-line change.
- A promise about the scope of future rounds.
