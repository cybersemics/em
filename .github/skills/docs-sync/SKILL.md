---
name: docs-sync
description: >-
  ALWAYS USE THIS SKILL when a change makes something in `docs/` no longer true.
  Routes the files you changed to the docs that describe them, and brings those
  docs back in line with reality before the change is committed.
allowed-tools:
  - bash
---

This is the **Docs Sync** skill. It runs near the end of a change, once you know what you actually touched: work out which documents your change made wrong, and fix them in the same commit.

The reason this skill exists: `docs/` is not decoration, it is the fastest route into an unfamiliar subsystem, and the `plan` skill requires reading it before any implementation. That makes a stale doc worse than a missing one. A missing doc sends the next agent to the source; a wrong doc sends it confidently in the wrong direction, into a plan built on a constraint that no longer holds. And the damage compounds — every change that leaves a doc behind makes the next session start from a worse map. Documentation stays useful only if the same session that invalidates it also repairs it.

---

## When this skill runs

- **As a step in `end-session`**, before the commit-and-push step, so the doc edits are part of the change rather than a promise to follow up.
- **When the `plan` skill named documents this change would make wrong** — that list is the primary input here.
- **Whenever you are asked to update the docs directly.**

---

## Step 1: Work out which docs are in scope

Start from what you changed:

```bash
git diff --name-only origin/main...HEAD   # committed on this branch
git status --porcelain                     # not yet committed
```

Then find the affected documents three ways. They catch different things, and the table is the weakest of the three — run all of them.

**a. What the plan already told you.** If the `plan` skill listed documents this change would make wrong, that list is the strongest input here: it was written by an agent that had the whole surface area in hand and was reasoning about behaviour, not paths. Start from it and add to it. Never narrow it.

**b. By name.** Grep `docs/` for the identifiers you actually changed — renamed or deleted functions, components, hooks, `=` attributes, command ids, exported types:

```bash
git diff origin/main...HEAD | grep -E '^-' | grep -oE '\b[a-zA-Z][a-zA-Z0-9]{4,}\b' | sort -u > /tmp/touched
grep -rnFf /tmp/touched docs/ --include='*.md' | sort -u
```

Noisy, and worth skimming rather than trusting wholesale — but it finds every document that mentions what you changed, regardless of which document is supposed to own it. This is the pass that catches a doc describing your code from another subsystem's point of view.

**c. By path, using the table below.** The mechanical backstop, and the narrowest of the three.

| Doc | Describes | Update it when |
| --- | --- | --- |
| [`folder-structure.md`](../../docs/folder-structure.md) | The layout of `src/` and what kind of code belongs in each module | You add, remove, or rename a directory under `src/`, or put a kind of code somewhere the doc does not account for |
| [`data-model.md`](../../docs/data-model.md) | `src/selectors/**`, thought manipulation in `src/util/**`, `src/@types/**` | The shape or meaning of thoughts, contexts, paths, lexemes, or views changes, or a documented selector's contract changes |
| [`persistence.md`](../../docs/persistence.md) | `src/data-providers/**`, `src/redux-enhancers/pushQueue.ts`, `src/redux-middleware/pullQueue.ts` | Storage, sync, replication, or the push/pull queues change |
| [`cursor-and-caret.md`](../../docs/cursor-and-caret.md) | `src/device/selection.ts`, `src/components/Editable.tsx`, cursor actions and stores | The relationship between the cursor and the browser selection changes, or how selection is accessed |
| [`layout-rendering.md`](../../docs/layout-rendering.md) | `src/components/LayoutTree.tsx`, `src/hooks/usePositionedThoughts.ts`, the autocrop mechanism | Thought positioning, virtualization, or autocrop behaviour changes |
| [`drag-and-drop.md`](../../docs/drag-and-drop.md) | `src/hooks/useDrag*`, `src/hooks/useDrop*`, the drag-and-drop components | Drop targets, react-dnd wiring, or drag behaviour changes |
| [`metaprogramming.md`](../../docs/metaprogramming.md) | The `=` attributes and the selectors and components that read them | You add, remove, rename, or change the effect of an `=` attribute |
| [`commands.md`](../../docs/commands.md) | `src/commands/**`, `src/commands.ts` | You add, remove, or change a command, its shortcut, or the command system itself |
| [`glossary.md`](../../docs/glossary.md) | The project's vocabulary, across all of `src/` | You introduce, rename, or retire a term of art — anything a newcomer would have to look up |
| [`testing.md`](../../docs/testing.md) | `src/e2e/**`, `src/test-helpers/**`, `src/setupTests.js` | Helper contracts, test patterns, platforms, or runners change |
| [`agents/*.md`](../../docs/agents/) | `.github/skills/**`, `.github/agents/**`, `.github/copilot-instructions.md`, `.github/workflows/copilot-setup-steps.yml`, `.github/workflows/tdd.yml`, the `scripts/*.mjs` the agent depends on | Anything about how the agent works changes — a skill, the prompts, the environment, the MCP wiring |

**A changed file that matches no row is a finding, not a pass.** Either the document that should describe that area does not exist — say so in your report, and do not invent one on the spot — or this table is missing a row, in which case add it here as part of your change.

**The table is a floor, not a ceiling.** It is keyed on file paths, so it can only find documents that own files you touched — and a change routinely falsifies a document it shares no files with. Change `src/selectors/getChildren.ts` and the table sends you to `data-model.md` alone; in fact `glossary.md`, `metaprogramming.md`, and `testing.md` all cite that function too, each describing it from their own subsystem's point of view. The by-name pass finds those three. The table never will. Cross-cutting documents are worse still: `glossary.md` and `folder-structure.md` describe all of `src/` and can be invalidated from anywhere.

So after routing, ask the question the table cannot: **what behaviour did I change, and does any document assert something about it?** Grep for the concept in the vocabulary the docs use — which is why `glossary.md` is worth knowing before you need it. If the answer is genuinely nothing, that is a real `docs: unaffected`.

**This table is not a reading list.** It tells you which documents your change might have *broken*; it says nothing about which you should have *read*. Deciding what to read is the `plan` skill's job, and it starts from `docs/readme.md`, `folder-structure.md`, and `glossary.md` precisely because you cannot know in advance which subsystem a problem really lives in. Narrowing your reading to the rows this table happens to match would be a way to guarantee you only ever learn about code you already knew to look at.

**A doc in scope is not automatically a doc that changed.** The table tells you where to look; Step 2 decides whether anything is actually wrong.

---

## Step 2: Find the claims that are now false

Read the relevant **section**, not the whole document. Three things go stale, in rough order of how often:

1. **A source path that moved, was renamed, or was deleted.** The most common and the easiest to miss, because the surrounding prose still reads fine. Check the paths in any doc you are touching:

   ```bash
   for f in $(grep -ohE 'src/[A-Za-z0-9_/.-]+\.(tsx?|jsx?)' docs/<doc>.md | sort -u); do
     [ -e "$f" ] || echo "MISSING: $f"
   done
   ```

   There are already known dead references in `docs/` — including a `.ts` path that is really `.tsx`. Fix the ones in the area you touched; leave the rest rather than expanding your change.

2. **A sentence asserting behaviour you just changed.** Includes the quiet ones: an assumption stated as fact, an ordering guarantee, a "this is the only place that…" claim you have just made untrue by adding a second place.

3. **A diagram, table, or list that enumerates things.** A mermaid diagram with a node per skill, a table with a row per platform, a count in a heading. These go wrong silently because the prose above them still reads correctly.

---

## Step 3: Edit for reality, not for history

**Documentation describes how the project works now, and why it is that way. It is not a changelog.** This is the rule that decides most edits.

- **Replace the false statement.** Do not append "as of #4712 this changed", "previously X, now Y", or "note: this behaviour was updated". Git already carries the history, and a doc that accumulates change notes gets longer and less true at the same time — the next reader has to work out which paragraph is current.
- **Keep the reasoning.** A doc explaining *why* something is the way it is — why iOS sessions are created outside the tooling, why a regression test is committed switched off — is recording design intent, not history. Deleting rationale damages a doc as much as leaving a false claim in it. If your change makes the reasoning wrong, rewrite the reasoning; do not strip it.
- **Change what you made wrong, and stop.** Do not rewrite a document because you happened to open it. An unrelated improvement is a separate change with its own review.
- **Prefer a paragraph in an existing doc to a new doc.** If a new file is genuinely warranted, link it from [`docs/readme.md`](../../docs/readme.md) in the same commit — an unlinked doc is one nobody finds, including the next agent.
- **Write it the way the rest of the file is written.** Match the surrounding voice and density. Docs here explain reasoning in prose rather than listing bullet points of facts.

---

## Step 4: Commit the doc with the change

The documentation edit belongs in **the same commit** as the change that made it necessary.

Not a follow-up commit, not a follow-up PR, and never ahead of the change. A doc updated before the code lands describes something that is not true yet, which is the worst state available — confidently wrong, with nothing to signal it. And a deferred "docs" commit is the one that never gets made.

---

## Step 5: Report

Hand back one of these, so `end-session` can carry it into the final report:

```
docs: updated docs/persistence.md, docs/folder-structure.md
docs: unaffected — <one-line reason>
```

`docs: unaffected` is a legitimate and common outcome — most fixes change behaviour no document asserts. But it is a claim you make **after** checking the table, not a default.

---

## Failure modes to avoid

- **Turning the doc into a changelog.** The most likely failure here, because appending is easier than rewriting and feels more honest. It is not: the reader wants the current state, not a diff of how it got there.
- **Documenting the change rather than the state.** "Added an option to disable autocrop" is a changelog entry. "Autocrop can be disabled with…" is documentation. Write the second one.
- **Fixing the prose and leaving the diagram.** If a mermaid node, table row, or count in a heading enumerates what you changed, it is part of the same edit.
- **The blanket rewrite.** Opening a doc to correct one sentence and restructuring it. Now the change is unreviewable and the real correction is buried.
- **Skipping silently.** Concluding no doc applies without going through the table. If you did not check, you do not know.
- **Treating the table as the answer.** It is the narrowest of the three routes and the only one that cannot see behaviour. A change whose paths match one row has not thereby been shown to affect one document.

## Escalation

- If your change **contradicts design intent** recorded in a doc — not a detail, but the stated reason a subsystem is built the way it is — stop and surface it to the user. Quietly rewriting the intent to match new code erases the only record that a deliberate decision was ever made. That is an architectural conversation, not a documentation edit.
- If a changed area has no document and clearly warrants one, say so in your report rather than writing it mid-session. A new doc is worth doing deliberately.
- Default to autonomous action. Escalate only when the correct path is genuinely ambiguous.
