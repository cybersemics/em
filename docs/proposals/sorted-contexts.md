# Proposal: Keep sorted contexts sorted in one place

Status: discussion. This describes a proposed design, not how the app works today. See [data-model.md → Visibility and sorting](../data-model.md#visibility-and-sorting) for the current behavior.

## Problem

A sort preference is materialized into `rank`. Every action that creates, moves, or edits a thought is responsible for leaving each sorted context it touches in sorted order. When one forgets, the Sort Picker icon turns red ("Ranks do not match sort condition").

We have fixed these one at a time. There have been around 20 "Red Sort Icon" issues, each with its own fix: Pin All (#4079, #4080), Table View (#4081, #4082), Mark Complete (#4083), Split Sentences (#4084, #4085), Alphabetical duplicates (#3964, #4483), Archive (#4086), Outdent (#4096, #4097), Favorite (#4098), Categorize (#4101), Swap Parent (#4005), Delete Subthought (#5695), Pin (#5736), New Thought with a bullet style (#5854), and more. The next action that moves a thought starts out without a fix.

The bugs cluster into a few causes, which are the cases Trevin raised in #5854:

| Cause | Examples |
| --- | --- |
| A thought that is _placed_ rather than sorted (empty, emoji-only, or a hidden attribute) is used as a neighbor when ranking a sorted thought | #5854 (`=children`), #4086 (`=pin`), #4081 (`=view`), #3978, #3992 |
| An action changes a sort key of a thought it did not move | #5695 (deleting a child bumps the parent's `lastUpdated`), #3965 (a note edit re-sorts its owner) |
| An action moves a thought into a sorted context without ranking it | #4005, #4096, #4097, #4101 |
| An action creates several thoughts with tied sort keys | #4085, #4483 |

## Proposal

Two changes, building on #5356.

### 1. One definition of "sorted"

Today three places decide which children take part in a sort, and they disagree:

- `getSortComparator` exempts empty and emoji-only thoughts (by rank), unless `sortEmpty` is set.
- `sort` sets `sortEmpty`, so empty thoughts float to the top.
- The Sort Picker check skips empty thoughts, emoji-only thoughts, and hidden attributes.
- `getSortedRank` ranks against all children, including hidden attributes, which is the cause of #5854.

Let's define one predicate for a _sorted child_: a visible child with a non-empty, non-emoji sort key. Every other child is _placed_, keeps its rank, and is never used as a neighbor when ranking a sorted child. The invariant is then simple to state:

> In a context with a sort preference, the sorted children appear in rank order exactly as the comparator orders them.

`getSortedRank`, `sort`, the Sort Picker check, and the new pass below all use the same predicate.

This covers two of Trevin's cases directly:

- **Empty thoughts stay where you're typing.** An empty thought is placed, so nothing re-ranks it until it has a value. Once it does, it becomes a sorted child and is ranked on the edit that gave it one.
- **Hidden attributes do not affect insertion.** `=children`, `=sort`, `=pin`, and `=view` are placed above their siblings and are invisible to the ranking of sorted children.

### 2. One pass per action

As proposed in #5356, a store enhancer re-checks every sorted context the action touched and re-ranks it if the invariant is broken. It runs inside `undoRedoEnhancer` and `pushQueue`, so the re-sort is part of the original action: one undo step, one render, one flush.

Trevin's other two cases refine which contexts count as touched:

- **Indirect changes to sort keys.** The pass derives touched contexts from the action's `thoughtIndexUpdates`. Checking the parent of each updated thought already covers `Updated`: when deleting a child bumps the parent's `lastUpdated`, the parent is itself an updated thought, so _its_ parent is re-checked. `Note` is the exception, since the sort key lives at `=note/<value>`, two levels below the thought it sorts. Let's give each sort type a function that maps an updated thought to the context whose order it can affect, rather than special-casing Note in the walk.
- **Undo/redo.** `undo` and `redo` apply patches without calling the inner reducer, so the pass is skipped, which is correct: the restored state was sorted when it was recorded.

When the invariant is broken, the pass re-ranks only the sorted children that are out of order, with `getSortedRank`, rather than renumbering the whole context with `sort`. This leaves placed children where they are and keeps the persisted placement minimal.

The ad hoc `getSortedRank` calls in each action can stay as the primary placement. The pass is the safety net.

### 3. Assert the invariant in tests

The Sort Picker check is the only place the invariant is verified, and only when a person looks at the toolbar. That is why these bugs reach QA.

Let's add the invariant to `validateStateEnhancer`, which already runs after every action in development and test. Any test that leaves a sorted context unsorted then fails without a dedicated assertion. Beyond that, a single parameterized test can run every command against a sorted context of each sort type, ascending and descending, with and without a bullet style, and catch the next red icon before it is filed.

## Open questions

1. Should the pass ignore `lastUpdated`-only changes from `moveThought`, which bumps the source and destination parents? Today `moveThought` re-ranks them under `Updated`. If the pass covers it, that code can go.
2. Should Alphabetical re-sort while typing, or only when the edit is committed? Today it re-ranks on every edit.
3. Once the pass and the test assertion are in place, is the red icon still needed, or can it be removed as the comment on it already anticipates?
