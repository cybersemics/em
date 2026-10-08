---
name: report-review-gaps
description: Generate a review gap report — the feedback a final reviewer left on PRs after a first reviewer had already reviewed them, turned into review principles and published as a Liminal-styled artifact. Use when asked for a review gap report, or for what a first reviewer missed, ahead of a check-in.
---

# Review Gaps

The report is shared directly with the first reviewer, so it is about principles to adopt, not a scorecard. Every sentence must be professional and respectful.

## 1. Collect

Ask for, or take from the request, the first reviewer, the PR authors and the start date. The final reviewer defaults to the authenticated `gh` user.

```bash
.github/skills/report-review-gaps/collect.mjs --first trevinhofmann --authors BayuAri,ethan-james --since 2026-07-01 > gaps.json
```

The script returns every comment the final reviewer posted after the first reviewer's first review, as reviews, inline comments (with the diff hunk) and PR comments. It works on Copilot PRs opened for an author too.

## 2. Filter

Keep only substantive feedback. Drop:

- thank-yous, approvals with no content, and merge-conflict or "address the feedback" requests
- "Opened #N to track…" notes, unless the follow-up issue is a bug the PR's own changes exposed
- replies answering a question the first reviewer raised, since the first reviewer already caught that point
- comments the final reviewer later withdrew in the same thread. Read the replies before keeping a comment.
- minor non-blocking notes, and suggestions that turned out not to work

## 3. Group into principles

Group the kept comments into a few general principles (about 5–8). For each one, write:

- a short title stated as the rule itself
- two or three sentences of rationale
- the cases, each with the PR link, author, file path (for inline comments), a `recent` tag if it was posted in the last two weeks, an optional one-line neutral context, and the final reviewer's comment **verbatim** in a block quote
- an **Ask:** line giving a question a reviewer can put to any PR to catch this

Never quote the first reviewer, and never mention their "LGTM", or that they confirmed the behaviour.

## 4. Write the page

Load the `liminal` skill and style the page with it. The page sections, in order:

1. Header: date eyebrow, title "Second-Pass Review Gaps", a one-line goal (raise these points earlier, so final review can be a quick confirmation), and the stats (PRs scanned, PRs with substantive feedback, principles).
2. An "Overall pattern" panel with two or three bolded findings, such as what kind of feedback dominates and how much of it is recent.
3. The principles, numbered.
4. "Strong catches in first review": 4–5 good catches by the first reviewer, taken from their own review comments, each linked.
5. "To discuss": 3–4 neutral questions for the meeting.
6. A method footnote: authors, date range, and what was left out.

Check the page at 375px for horizontal overflow. Long URLs and code blocks are the usual cause.

## 5. Publish

Publish the page as an artifact, with `public/img/glow/glow-3a.avif` as `glow.avif`. Give the user the link, and remind them that the first reviewer can't open it until they share it.
