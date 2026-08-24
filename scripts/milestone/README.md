# Milestone

Automatic issue categorization for the `em` project. When an issue is opened, this picks the open GitHub milestone that best matches it and assigns it. Milestones here are subsystems rather than releases, so the milestone is the issue's category.

Success is silent — the assigned milestone is the whole result. When the selection is not confident enough to act on, no milestone is assigned and a comment asks @raineorshine for the category instead.

## Setup

Define env variables in `scripts/milestone/.env`:

```
GITHUB_TOKEN=
OPENAI_API_KEY=
```

`GITHUB_TOKEN` is only needed to write. Reading milestones and issues from a public repository works without one, so `--dry` runs and `yarn evaluate` need nothing but an OpenAI key.

## Usage

```bash
cd scripts/milestone
yarn issue 5092 --dry
```

Without an issue number the script falls back to `ISSUE_NUMBER` (set by a manual workflow dispatch), then to the issue in the workflow event payload. `--dry` performs the inference and prints the decision but writes nothing to GitHub.

## How the decision is made

The prompt is assembled from two halves. The system message is [`instructions.md`](instructions.md) — what each milestone means, real example issue titles from it, and the rules for choosing between them. The user message carries the **currently open** milestones, fetched from the GitHub API on every run, so a milestone created or closed today is reflected immediately with no file to update. The model may only choose a title from that list, or `null`.

Five independent samples are drawn in one request (self-consistency voting via the Chat Completions `n` parameter, which bills the input once and only multiplies the tiny output). Each vote is resolved against the open milestones — leniently, so a dropped emoji or `and` for `&` still matches, while a milestone that is not open is discarded as invalid rather than counted. The modal vote wins.

The milestone is then assigned only if **every** gate passes:

| Gate             | Default                            | Env                        |
| ---------------- | ---------------------------------- | -------------------------- |
| A milestone fits | the votes did not settle on `null` | —                          |
| No tie           | one candidate led outright         | —                          |
| Confidence       | `high`                             | `MILESTONE_MIN_CONFIDENCE` |
| Agreement        | 60% of valid votes                 | `MILESTONE_MIN_AGREEMENT`  |

Anything less asks for a category, quoting the closest guess, the agreement, and every reason the gate withheld — so answering is a matter of confirming or correcting rather than categorizing from scratch. A run that fails inference three times, or finds no open milestones at all, comments and fails the workflow: those are broken, not uncertain.

Inference is tunable via `MILESTONE_*` env vars (see `.env.example`): `MILESTONE_MODEL`, `MILESTONE_VOTES`, `MILESTONE_REASONING_EFFORT`, `MILESTONE_TEMPERATURE`.

## Evaluation

[`samples/`](samples) holds issues whose milestone a human already chose, plus a few where the correct answer is to ask. **The samples are never placed in the prompt** — the prompt teaches the categories through the definition table and example titles instead. Holding them out is what makes the evaluation a measurement rather than a memory test, and a unit test fails if a sample's title ever appears in the instructions.

```bash
cd scripts/milestone
yarn evaluate
```

The harness runs the exact pipeline the workflow uses over every sample and grades it strictly: the assigned milestone must equal the recorded one, and a sample the gate refused to assign counts as a prediction of "no milestone", because that is what production would do. It reports accuracy, precision over the assignments actually made, an outcome breakdown, the mismatches, and a calibration table — then **exits non-zero below `MILESTONE_MIN_ACCURACY`** (default 0.8, against a measured baseline of 86%), so a prompt edit that regresses accuracy fails rather than printing a slightly worse number nobody compares.

Run it before and after editing the instructions. It makes model calls but never writes to any issue, and it is deliberately not part of CI.

Run `yarn test` from the repository root after editing `instructions.md`. The sample-integrity tests guard it, but the Test workflow ignores `**/*.md`, so a pull request that touches only the prompt will not run them — see [Path filtering](../../docs/testing.md#path-filtering). Sample edits are `.json` and do trigger Test normally.

Adding a sample: fetch the issue, save it as `samples/issue-<number>.json`, and confirm the milestone is one a human actually assigned.

```json
{
  "input": { "title": "…", "body": "…", "labels": ["bug"] },
  "expected": "🧤 Drag & Drop",
  "source": { "type": "github", "issue": 4839 }
}
```

Use `"expected": null` for an issue that genuinely fits no milestone, which asserts that the workflow asks rather than guesses.

## Workflow

| Workflow                                                                     | Script         | Trigger                                     | Description                                                                                        |
| ---------------------------------------------------------------------------- | -------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Assign Issue Milestone](../../.github/workflows/assign-issue-milestone.yml) | `src/issue.ts` | Issue opened, or manual `workflow_dispatch` | Assigns the best-matching open milestone, or comments asking for a category when it cannot decide. |

It needs the `OPENAI_API_KEY` repository secret; the `GITHUB_TOKEN` is supplied by Actions. The manual dispatch takes an `issue` number, which is also how an existing uncategorized issue gets a milestone.

An issue is skipped, silently and successfully, when it already has a milestone or is really a pull request. A human's categorization is never overwritten.
