---
name: plan
description: >-
  ALWAYS USE THIS SKILL before writing implementation code for any non-trivial
  change. Produces a written architectural plan grounded in the existing
  codebase, then critiques it — both stages, one agent, one atomic unit.
allowed-tools:
  - bash
---

This is the **Plan** skill. Before you create a branch, edit a file, or write a fix, you produce a written architectural plan grounded in the code that already exists — then you critique that plan yourself. **Plan and Critique are two stages of one atomic skill, performed by one agent.** You do not hand off to a separate reviewer; you produce the plan and you tear it down, in the same pass, before any implementation begins.

The reason this skill exists: agents solve problems locally. They default to writing new code instead of extending what is there, duplicate logic that already exists, and rationalise whatever they slapped together after the fact. Every one of those failures is the same root cause — **not looking at and understanding what already exists before writing new code.** This skill forces the reconnaissance first, and makes you defend it before you are allowed to build.

Follow these instructions **directly**, while observing the methodology described to you (the issue-repro gate, and the use of `ci-monitor`, `test-diagnosis`, and `puppeteer` skills where appropriate). DO NOT deviate from this process, skip stages, or begin implementation before the Critique stage passes.

## When this skill runs

- **For an issue with "Steps to Reproduce":** run this skill **after** `issue-repro` has reproduced the failure, and **before** you write the fix. You cannot honestly judge adjacent-behaviour impact until you have seen the real failure mode. Reproduction first, plan second, implementation third.
- **For any other non-trivial change** (feature, refactor, behaviour change): run this skill before creating a branch or editing any file.
- **Trivial changes** (a typo, a copy tweak, a version bump) do not need a full plan. If you are unsure whether a change is trivial, it is not — run the skill.

## Stages

1. **Plan** — produce the architectural plan: existing surface area, build-vs-extend, adjacent behaviour, approaches, diff sketch. Evidence required.
2. **Critique** — adversarially review your own plan against the actual codebase. If it fails, revise and re-critique. Loop until it passes.

Reading source code to build the plan is expected and required. **Writing implementation code is not** — that does not begin until the Critique stage passes.

---

## Stage 1: Plan

Produce a written plan with the five sections below. Sections 1–3 are **mandatory and require quoted evidence** — they are the load-bearing sections and the ones agents most often fake. Sections 4–5 are lighter but required.

> **Evidence rule.** "I looked at X" is not evidence. Evidence is a `path/to/file.ts:line` reference **and** the relevant lines quoted in a code fence. A section that asserts something about existing code without a quoted fence is incomplete — the Critique stage will reject it.

### 1. Existing surface area _(mandatory, evidence required)_

What functions, modules, helpers, types, or tests already touch this concept? Find them before you decide anything.

**Start with the repo's documentation — it is required reading, not optional.** The `docs/` folder in the repository root is the module/boundary map and the fastest way to orient before you touch source. Read the relevant files and `grep docs/**/*.md` for your concept:

- `docs/readme.md` — the index of every subsystem doc. Skim it first to find which docs apply to your task.
- `docs/folder-structure.md` — what lives where under `src/`, and **what belongs in each module**. This tells you where a change _should_ go before you decide where to put it (e.g. reducers live in `src/actions/`, pure derived slices in `src/selectors/`, and `src/device/selection.ts` is the single lint-enforced access point to `window.getSelection()`). A build-vs-extend decision that ignores this is wrong by construction.
- `docs/glossary.md` — project vocabulary (lexeme, cliff, autofocus, tsid, tangential context, …). If the task uses a term you cannot define, resolve it here before proceeding.
- The subsystem docs — `data-model.md`, `cursor-and-caret.md`, `persistence.md`, `layout-rendering.md`, `drag-and-drop.md`, `metaprogramming.md`, `commands.md`, `testing.md` — encode design intent and invariants for each area. Read the one(s) your change touches and **quote the relevant constraint** in your plan.

Then `grep` the source for the concrete functions, types, and tests. For each relevant piece:

- **File and lines:** `path/to/file.ts:120-134`
- **Quoted code:** the actual lines, in a fence.
- **What it does**, and crucially **what it implicitly assumes** — the constraints already encoded in the code: regex anchors (e.g. a `^` that means "leading only"), type signatures, narrow scope, ordering assumptions, early returns.

The point is to surface constraints that are _already in the code_ so you do not reinvent or violate them. (Case in point: a helper whose regex is anchored `^…` only handles the leading case — building a whole-string scanner beside it is wasted code and a bug.)

If you genuinely find nothing pre-existing, say so explicitly and show the searches you ran (the grep commands and that they returned nothing). "Nothing exists" is a finding that must itself be evidenced.

### 2. Build vs. extend decision _(mandatory)_

Given the surface area above, does this change **extend existing code** or **introduce a new path**? State the decision and justify it against section 1.

- **If extending:** which function/module specifically, and what the change to it is.
- **If new:** why the existing path is genuinely not appropriate — what specifically about it cannot accommodate this change. "It was easier to write fresh" is not a reason.

Default to extending. A new path needs a defended reason.

### 3. Adjacent behaviour surface _(mandatory)_

What _other_ behaviours in this subsystem might this change affect? Enumerate them explicitly — even when you believe the answer is "none," list what you considered and why each is safe.

For editor / interaction changes in `em`, that means actively asking about: **deletion / backspace, text selection, caret placement, undo / redo, IME composition, copy / paste, gesture handling, and multi-cursor / collapse behaviour.** Changing one path in an editor routinely breaks an adjacent one (e.g. an insert-on-type change that makes backspace re-insert what it just deleted). For non-editor changes, enumerate the analogous neighbours: callers of the function, subscribers to the state, other entry points to the same reducer.

For each behaviour you touch or border: is there existing test coverage? If not, note that you will verify it manually (and how).

### 4. Approaches considered _(at least two, kept brief)_

Sketch at least two approaches and compare them on: reuse of existing code, complexity, and edge cases. This exists to break first-instinct lock-in — even a short comparison is enough. State which you chose and why.

### 5. Diff sketch _(plain words, not code)_

Where the change will live: which files, which functions, the shape of the modification. Enough that a reviewer can confirm the _right surface_ is being touched — but not the actual code. List any new files and justify each against section 2.

---

## Stage 2: Critique

Now turn on your own plan. Same agent, same pass — this is not optional and not a rubber stamp. Review the plan against the **actual codebase**, not against itself. Check each:

- **Surface-area reality check.** Re-open the files cited in section 1. Do the quoted lines actually say what the plan claims? Do the implicit assumptions (anchors, signatures, scope) hold? Is there a relevant helper, type, or test the plan _missed_? Re-grep to be sure.
- **Build-vs-extend defensibility.** If the plan chose "new," is the stated reason real, or is an existing path actually adequate? Try to defeat the new-path decision.
- **Missing adjacent behaviour.** Name at least one behaviour from section 3's checklist the plan did not fully consider, and confirm it is actually safe — by reading the relevant code, not by assertion.
- **Approach.** Does the _rejected_ approach actually look better than the chosen one on reuse or edge cases? If so, switch.
- **Docs alignment.** Does the plan contradict design intent or an invariant stated in the relevant `docs/` file? If it puts code where `docs/folder-structure.md` says it does not belong, or violates a constraint in the subsystem doc for the area you are touching, fix the plan — the docs describe the intended architecture, and "the code happened to allow it" is not a defence.
- **Evidence completeness.** Does every claim in sections 1–3 have a `file:line` + quoted fence behind it? Any bare assertion fails the gate.

### Loop

```
critique the plan against the codebase
if a check fails → revise the plan (back to Stage 1 for that section) and re-critique
if all checks pass → record the plan, then proceed to implementation
```

Record the final plan where the work will be reviewed:

- If a PR exists or will exist, put the plan in the **PR description** (below the issue number).
- Otherwise, output it in full in your response before you write any code.

### Gate confirmation

When — and only when — the Critique stage has passed, output exactly this line, verbatim, on its own line:

`plan: complete — architectural plan produced and critique passed per .github/skills/plan/SKILL.md.`

Only after that line may you create a branch (if not already on one) and begin implementation.

---

## Failure modes to avoid

- **Cargo-cult filling.** Plausible-sounding sections with no quoted evidence. The evidence rule and the Critique stage exist to catch exactly this — a surface-area section with no code fence is not done.
- **Plan-as-theatre.** Producing the plan, then ignoring it and building whatever. The gate confirmation line is your commitment that the plan reflects what you are about to build; if implementation diverges from the plan, stop and revise the plan first.
- **Over-planning a trivial change.** If producing the plan costs more than the change it guards, you are either over-scoping the plan or the change was trivial — see "When this skill runs."

## Escalation

- If the existing surface area reveals the task conflicts with how the subsystem is designed (e.g. the "fix" would require violating an invariant encoded across several files), stop and surface this to the user before implementing — that is an architectural decision, not an implementation detail.
- Default to autonomous action. Escalate only when the correct path is genuinely ambiguous.
