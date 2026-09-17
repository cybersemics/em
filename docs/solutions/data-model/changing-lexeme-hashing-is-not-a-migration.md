---
title: Changing normalizeThought re-keys every Lexeme, and there is no migration to write
date: 2026-09-17
category: data-model
module: lexemes
problem_type: architecture_pattern
component: frontend
severity: medium
applies_when:
  - About to change normalizeThought, hashThought, or anything else that alters a Lexeme key
  - Adding, loosening, or reordering a rule inside REGEX_NORMALIZE
  - Looking for the migration hook that hashThought's MUST comment implies
  - A superscript or Context View entry is missing for a value that used to have one
  - Deciding whether a new derived SQLite table needs a version and a rebuild
tags:
  - lexeme
  - hashthought
  - normalization
  - derived-tables
  - migration
  - self-heal
---

# Changing normalizeThought re-keys every Lexeme, and there is no migration to write

## Context

[`hashThought`](../../../src/util/hashThought.ts) is `murmurHash3.x64.hash128(normalizeThought(value))`, and its doc comment closes with **"Stored keys MUST match the current hashing algorithm."** It used to close with one more line — `Use schemaVersion to manage migrations.` — deleted in 638bc28b94 (#5002) along with `state.schemaVersion` and every `SCHEMA_*` constant, because the value was write-only and the machinery it gated (`src/migrations/`, `scripts/src/migrate.ts`) had gone before it. The MUST survived its own resolution. `grep -rn 'schemaVersion\|SCHEMA_' src` returns nothing today, nothing reads a stored key back against the algorithm that produced it, and there is no migration mechanism to invoke.

What the key depends on is [`normalizeThought`](../../../src/util/normalizeThought.ts) and its single combined `REGEX_NORMALIZE`; [data-model.md → Lexeme](../../data-model.md#lexeme) lists the transformations and records that a `Lexeme` stores no value text, only the contexts that hash to it.

## Guidance

**Change the normalization when the normalization is wrong, and expect every persisted Lexeme whose value it touches to be re-keyed in place.** That has been the outcome twice — #2248 and #4809 — and neither carried anything but the function and its tests.

The reason it is safe is not that the old rows are cleaned up. They are not, and the two app-owned derived tables in [persistence.md → Derived tables](../../persistence.md#derived-tables) differ on exactly this point:

| Derived table | Version gate | On mismatch |
| --- | --- | --- |
| `em_attribute_children` | `INDEX_VERSION`, recorded in `em_attribute_children_meta` | `ensureAttributeChildrenIndexReady` clears the rows and rebuilds by walking the tree from the global root |
| `em_lexemes` | none — [`lexemes.ts`](../../../src/data-providers/treecrdt/lexemes.ts) is `id` → `payload_json` and no meta table | nothing runs; a row written under the old hash sits there until a thought with that value is touched |

So bumping a version is not a thing you declined to do. The rebuild step that a version would trigger has no counterpart for lexemes, and adding one would mean writing it.

**It is tolerable because a re-keyed Lexeme is an unreachable row, not a wrong one.** Thoughts are keyed by `ThoughtId` in the CRDT tree and carry their own `value` in the decoded payload, so nothing about the tree moves. A lookup at the new hash misses; the orphan under the old hash is reached by nothing and shows nobody anything. Step 3 of [persistence.md → Change observation (materialization)](../../persistence.md#change-observation-materialization) — `refreshThoughtsFromMaterializationChanges` — then re-derives the Lexeme at the new key the next time any thought with that value is touched.

**Name the cost rather than assuming it away: a window of stale rows and missing superscripts, of unbounded length.** Nothing sweeps the orphans, and the window closes per value, on edit. A user who never touches an affected thought keeps the gap forever.

**The self-heal has a qualifier.** The rewrite is built from the contexts in Redux, not merged into the row on disk — see [Editing a thought overwrites the persisted Lexeme with only the loaded contexts](lexeme-contexts-clobbered-when-not-loaded.md). A re-key followed by an edit made while most of the thoughtspace is unloaded heals to a Lexeme holding one context.

## Why This Matters

The MUST comment is the only statement on the subject anywhere in the tree, and it now points at a capability that was removed a month later. A reader who trusts it goes looking for a migration hook and finds none, which reads as a gap in the codebase rather than a decision — and the natural next move, abandoning a correct normalization fix because the migration cannot be written, is the expensive one.

The neighbouring derived table makes the misreading more likely, not less. Anyone who has read [`attributeChildren.ts`](../../../src/data-providers/treecrdt/attributeChildren.ts) has seen a version constant, a meta table and a rebuild walk, and has no reason to expect the table next to it to work on a different principle.

## When to Apply

- **Before changing `REGEX_NORMALIZE` or `normalizeThought`, work out which existing values change key**, and accept that as the blast radius. There is no query to run afterwards and no sweep to schedule.
- **Add the distinction you intend to [`normalizeThought`'s tests](../../../src/util/__tests__/normalizeThought.ts) as a named `describe` block**, the way #4809's `describe('underscores')` states its invariant in its title. That block is the only thing that stops the next normalization change from quietly undoing yours.
- **Derive a new guard from the stripping result, never from a second classifier.** A parallel regex that decides the same question drifts from `REGEX_NORMALIZE` the first time either one is edited.
- **If old rows genuinely must go, the shape already exists** — `INDEX_VERSION` + a meta row + an `ensure…Ready` rebuild, as in [`attributeChildren.ts`](../../../src/data-providers/treecrdt/attributeChildren.ts). Write that for `em_lexemes` deliberately; do not look for a general migration runner, because there is not one.
- **Verify by touching, not by reloading.** A missing superscript after a normalization change is the expected transient; the test is whether editing the thought brings it back.

## Examples

#4809 is the shape in miniature. `REGEX_NORMALIZE` strips tags, diacritics, punctuation and whitespace, and the only guard against stripping everything was `s.length <= 1` — so any longer value made entirely of stripped characters (`__`, `___`, `..`) hashed to the empty thought's key and counted as a duplicate of the others. The fix is one line, whose rationale is the comment directly above it in [`normalizeThought`](../../../src/util/normalizeThought.ts):

```ts
const stripped = normalized || s
```

That re-keyed every punctuation-only thought in every existing thoughtspace, and shipped with nothing but its tests.

The shape it avoided was masking the values further downstream. [`REGEX_PUNCTUATIONS`](../../../src/constants.ts) (`/^\W+$/i`) already suppresses the superscript for punctuation-only values inside `showSuperscript` in [`ThoughtAnnotation`](../../../src/components/ThoughtAnnotation.tsx), which is why `..` never surfaced the bug while `__` did — `_` is a word character, so underscores walked straight through the mask. A second classifier at the render layer cannot fix a collision in the key the Context View reads, nor in the normalized comparison [`moveThought`](../../../src/actions/moveThought.ts) uses to find a duplicate sibling, and it drifts from `REGEX_NORMALIZE` the first time either one is edited.

## Related

- #4809, #2248 — the two normalization changes that shipped with no migration.
- #3627 — the underscore duplicates that motivated the second one.
- #5002 — the removal of `schemaVersion`, which left the MUST comment without its resolution.
- [data-model.md → Lexeme](../../data-model.md#lexeme) — what the key is derived from and what a `Lexeme` holds.
- [persistence.md → Derived tables](../../persistence.md#derived-tables) — `em_lexemes` and `em_attribute_children`, and why neither replicates.
- [persistence.md → Change observation (materialization)](../../persistence.md#change-observation-materialization) — the refresh that re-derives a Lexeme at its new key.
- [Editing a thought overwrites the persisted Lexeme with only the loaded contexts](lexeme-contexts-clobbered-when-not-loaded.md) — the limit on how well the self-heal heals.
