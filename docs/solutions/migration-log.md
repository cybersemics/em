# Migration Log

`docs/solutions/` is being backfilled from the project's own history. This file records what has been swept, how, and what is left, so the next pass does not re-read the same threads.

## Method

Reproducible without the GitHub search API, which rate-limits at 30 requests per minute and will not paginate past 1000 results. The GraphQL API does both in one pass:

1. Page `repository.issues(states: CLOSED)` and `repository.pullRequests(states: MERGED)`, ordered by `createdAt` descending, pulling body, labels, every comment, review bodies, the file list with churn, and `closingIssuesReferences` in the same query. Stop when the page's oldest item falls out of the window.
2. Drop bot pull requests (`dependabot`, `renovate`) and anything whose title starts with `Bump `.
3. Partition by subsystem from a mix of title keywords and changed-file paths, and rank within each partition by a signal score: comment count, review-comment volume, body length, label, and recency. Review-comment volume is the single best predictor — a long review thread usually means someone was talked out of the obvious approach, and that argument is exactly what the merged diff does not record.
4. Read down each partition from the top, checking every candidate against the existing docs and against the current tree before it is written.

Write the pages to disk and read them back with `jq`. Do not capture a GraphQL response into a zsh variable and pipe it through `echo` — zsh's builtin `echo` expands the `\n` inside JSON string values into real newlines, and every downstream parse fails on control characters.

## Window

Swept: **issues closed and pull requests merged 2024-01-01 onward.**

| | Downloaded | In window | Excluded |
| --- | --- | --- | --- |
| Closed issues | 1400 (from 2020-12) | 1025 | 375 closed before 2024 |
| Merged pull requests | 2040 | 1146 | 582 bot/`Bump`, 312 merged before 2024 |

The floor is not arbitrary. Every platform underneath the feature code was replaced in or after 2024, so an item closed before then predates at least two rewrites and describes a tree that no longer exists — see the shelf-life table in [readme.md](readme.md). The 2021–2023 tail (375 issues, 312 pull requests) is presumed obsolete and was not read. If it is ever swept, it should be sampled rather than worked, and only for learnings that survive an explicit check against the current tree.

## Passes

_No pass has landed yet._

## What is left

- The unread tail of each partition. Signal ranking means the tail is genuinely lower-yield, not merely later, but it is not empty.
- The 2021–2023 tail — 375 issues and 312 pull requests — if it is ever judged worth sampling.
