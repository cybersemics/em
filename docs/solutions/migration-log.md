# Migration Log

`docs/solutions/` is being backfilled from the project's own history. This file records what has been swept, how, and what is left, so the next pass does not re-read the same threads.

## Method

Reproducible without the GitHub search API, which rate-limits at 30 requests per minute and will not paginate past 1000 results. The GraphQL API does both in one pass:

1. Page `repository.issues(states: CLOSED)` and `repository.pullRequests(states: MERGED)`, ordered by `createdAt` descending, pulling body, labels, every comment, review bodies, the file list with churn, and `closingIssuesReferences` in the same query. Stop when the page's oldest item falls out of the window.
2. Drop bot pull requests (`dependabot`, `renovate`) and anything whose title starts with `Bump `.
3. Partition by subsystem from a mix of title keywords and changed-file paths, and rank within each partition by a signal score: comment count, review-comment volume, body length, label, and recency. Review-comment volume is the single best predictor — a long review thread usually means someone was talked out of the obvious approach, and that argument is exactly what the merged diff does not record.
4. Read down each partition from the top, checking every candidate against the existing docs and against the current tree before it is written.
5. Line-anchored review comments live on `pullRequest.reviewThreads`, not on `comments`, and are worth a second query: alias 25 pull requests into one request and page through them.

Write the pages to disk and read them back with `jq`. Do not capture a GraphQL response into a zsh variable and pipe it through `echo` — zsh's builtin `echo` expands the `\n` inside JSON string values into real newlines, and every downstream parse fails on control characters.

## Window

Swept: **issues closed and pull requests merged 2024-01-01 onward.**

| | Downloaded | In window | Excluded |
| --- | --- | --- | --- |
| Closed issues | 1400 (from 2020-12) | 1025 | 375 closed before 2024 |
| Merged pull requests | 2040 | 1146 | 582 bot/`Bump`, 312 merged before 2024 |

The floor is not arbitrary. Every platform underneath the feature code was replaced in or after 2024, so an item closed before then predates at least two rewrites and describes a tree that no longer exists — see the shelf-life table in [readme.md](readme.md). The 2021–2023 tail (375 issues, 312 pull requests) is presumed obsolete and was not read. If it is ever swept, it should be sampled rather than worked, and only for learnings that survive an explicit check against the current tree.

## Passes

### Pass 1 — 2026-09-17

Partitions read, in descending signal order, with the existing docs and the current tree open alongside. Every candidate then faced three independent verifiers, each asked to *refute* it: one checking whether the substance was already in `docs/`, `AGENTS.md`, the instruction files, or a lint rule; one checking whether the mechanism still exists in the tree; one applying the counterfactual in [readme.md](readme.md#the-bar). A candidate needed at least two of three to fail to refute it.

Thirteen partitions, read top-down against the existing docs and the current tree. "Read in full" counts every
issue and pull request opened whole, including a few a reader followed out of a neighbouring partition.

| Partition | Items | Read in full | Candidates |
| --- | ---: | ---: | ---: |
| Commands, keyboard, gestures | 342 | 50 | 6 |
| Thoughts, lexemes, paths, ids | 89 | 56 | 6 |
| Editing, caret, selection | 348 | 32 | 5 |
| Layout, virtualisation, animation | 218 | 54 | 5 |
| Tests, e2e, CI | 399 | 35 | 5 |
| Build, deps, native shells | 98 | 76 | 5 |
| Search, context view, sort, attributes | 184 | 56 | 5 |
| Drag and drop | 126 | 53 | 4 |
| Persistence, sync, storage | 67 | 55 | 4 |
| Styling, Panda CSS, theming | 148 | 56 | 4 |
| Performance | 31 | 41 | 3 |
| Coding-agent infrastructure | 100 | 79 | 2 |
| Unpartitioned | 21 | 21 | 2 |
| **Total** | **2,171** | **664** | **56** |

Each of the 56 candidates then faced three verifiers, each asked to *refute* it and each told to default to refuting
when uncertain: one checking whether the substance was already in `docs/`, `AGENTS.md`, the instruction files, or a
comment beside the code; one checking whether the mechanism still exists; one applying the counterfactual in
[readme.md](readme.md#the-bar).

The funnel, end to end: **2,171 items → 664 read in full → 56 candidates → 10 killed outright → 29 contested, of
which 18 survived adjudication → 35 planned → 32 files**, three of them merged from two candidates each that turned
out to describe the same mechanism from different partitions.

### What the verifiers caught

| Lens | Verdicts | Refuted |
| --- | ---: | ---: |
| Still relevant | 56 | 0 |
| Already documented | 56 | 10 |
| Durable bar | 55 | 39 |

**Nothing was refuted for being obsolete.** The 2024 floor, and the requirement that every candidate be grounded in
the current tree before it was proposed, had already removed everything stale — so a third of the verification
budget bought nothing. A later pass should fold the relevance check into the reading and spend the budget on the
other two.

**The durable bar refuted two thirds, and nearly always alone.** Under a two-of-three rule that meant a deliberately
biased skeptic could not kill anything by itself, which is the wrong shape: the durable bar *is* the question, and
the other two lenses answer necessary-but-not-sufficient ones. Every candidate the durable lens refuted alone went
instead to a fourth adjudicator carrying no default — a skeptic to raise the objection, a judge to rule on it. Of
the 29 that reached it, 18 were kept and 11 dropped, so the objection was right about a third of the time. Running
the skeptic alone would have lost 18 learnings; trusting the two-of-three vote alone would have kept 11 that do not
belong.

**What kills a candidate here is usually a comment already sitting beside the code.** The ten that died read like a
compliment to the codebase: [`updateThoughts.ts`](../../src/actions/updateThoughts.ts) carries nineteen lines on why
a forced pull can re-apply a `reducerFlow`'s intermediate state; `MainActivity.java` carries eight on the Android
keyboard resize; the iOS caret regression test states the Safari event-retargeting mechanism in its own docblock;
[`testing.md`](../testing.md) already says that a CI step judging a test run is itself an assertion. A learning has
to survive the comment next to the code it describes, and in this repo that is a high bar.

### Considered and rejected

Twenty-one candidates reached full verification and did not survive it. They are listed because they are the
near-misses — the threads a later pass will find again and be tempted by. Every one of them was checked against the
current tree; none was rejected for being stale.

Rejected because the lesson is already written beside the code it governs:

- Android resizes the WebView when the keyboard opens — stated in `MainActivity.java`'s own comment.
- iOS Safari retargets synthesized mouse events onto a nearby editable — stated in the regression test's docblock.
- `moveThought` rewrites rank and can delete `=sort` — annotated at both call sites.
- A formatted-thought-only bug is almost always a node-relative offset — in [cursor-and-caret.md](../cursor-and-caret.md) and the accessors' JSDoc.
- Why pasted text lands as a subthought — written at the decision site, with issue numbers.
- Anything positioned by `usePositionFixed` must have no positioned ancestor — stated twice in the tree.
- A forced pull can re-apply a `reducerFlow`'s intermediate state — nineteen lines of comment in [`updateThoughts.ts`](../../src/actions/updateThoughts.ts).
- The TDD check's verdict is an exit code — [testing.md](../testing.md) already says a CI step that judges a test run is itself an assertion.
- Why swiping the toolbar one way scrolls and the other fires a button — across the three sites an engineer would read.
- Drag-end cleanup belongs in react-dnd's `end`, not `touchend` — in the JSDoc at both call sites.
- Clear Thought keeps formatting in CSS, not in markup.
- `packages/ai` is typechecked only by the Vercel build — and both load-bearing claims failed against the current tree.

Rejected on the counterfactual — a reader of today's code would not repeat the mistake:

- Context view animation stuttered in Chrome because the blur was a `text-shadow` — the wrong pattern no longer exists to repeat.
- A Copilot session aborting with a Rust panic is CodeQL, not this repository — the only non-recoverable part is one line of configuration state.
- Effect cleanup is not `componentWillUnmount`.
- Thoughts that vanish but return on reload were freed from the cache — `freeThoughts`' own JSDoc states the invariant.
- `moveThought` can delete the id you just moved.
- The red Sort icon is a rank invariant check, not a sort bug.
- The `sizes` map lags a render on purpose.
- A stale cursor is fatal — and the candidate was wrong about the third of its three claims.
- A new Redux action must register undo metadata.

## What is left

- **The unread tail of each partition.** Signal ranking means the tail is genuinely lower-yield, not merely later, but it is not empty — 664 of 2,171 items were opened.
- **Line-anchored review threads.** Pass 1 read review *bodies* and issue comments. The inline threads were pulled afterwards — 2,405 of them across 378 pull requests — and are a distinct seam: they hold the argument at the exact line, which is where the objection to an approach usually lands. Nothing in pass 1 was mined from them.
- **The 2021–2023 tail** — 375 issues and 312 pull requests — if it is ever judged worth sampling.
