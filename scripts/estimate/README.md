# Estimate

AI-powered issue estimation for the `em` project. Analyzes GitHub issues, assigns a t-shirt-size effort estimate, and syncs the estimated hours to Everhour.

## Setup

Define env variables in `scripts/estimate/.env`:

```
EVERHOUR_API_KEY=
EVERHOUR_PROJECT_ID=
OPENAI_API_KEY=
```

## Usage

```bash
# Backfill (dry run)
cd scripts/estimate
yarn backfill --dry 10
```

Dry-run flags: `--dry` skips both the model call and the Everhour write; `--dry-ai` skips only the model call; `--dry-everhour` skips only the Everhour write (and the issue audit comment).

## Evaluation

The estimator draws multiple independent samples per issue (self-consistency voting via the Chat Completions `n` parameter) and reports the modal category, so each estimate carries an `agreement` score (fraction of votes that agreed) and a self-reported `confidence`. Both are surfaced in the audit comment.

To measure accuracy, run the leave-one-out harness. For each labeled sample it retrieves the nearest neighbors from every _other_ sample (reusing the cached embeddings, so it makes no embedding calls), estimates the held-out issue, and compares to the known-correct category. It reports exact-bucket and ±1-bucket accuracy, a confusion matrix, a calibration breakdown, and how many estimates the confidence gate flagged for review. It makes model calls but never writes to Everhour.

```bash
cd scripts/estimate
yarn evaluate
```

Inference is tunable via `ESTIMATE_*` env vars (see `.env.example`): `ESTIMATE_MODEL`, `ESTIMATE_VOTES`, `ESTIMATE_REASONING_EFFORT`, `ESTIMATE_TEMPERATURE`.

## Retrieval few-shot (kNN)

Instead of stuffing every labeled sample into the prompt, the estimator injects only the _k_ samples most similar to the target issue. Each sample's title + body + labels is embedded once with an OpenAI embeddings model (`text-embedding-3-small` by default) and the vectors are cached on disk, committed to the repo at `.github/instructions/estimate/embeddings.json`. At estimate time only the target issue is embedded (one call); the cached sample vectors are cosine-ranked and the top _k_ neighbors (default 8, `ESTIMATE_NEIGHBORS`) are passed to the prompt ordered closest-last. The distribution of the neighbors' known categories (e.g. `M×4, S×3, L×1`) is injected as an extra signal.

Because only _k_ neighbors ever enter the prompt, the sample corpus can grow without bloating the prompt. When embeddings are unavailable (no API key, empty cache, or an embedding error) the pipeline falls back to the previous "all samples" behavior — it never hard-crashes.

Regenerate the cache after adding or editing samples (requires `OPENAI_API_KEY`). Only new or content-changed samples are re-embedded; pass `--force` to re-embed everything:

```bash
cd scripts/estimate
yarn embed          # embed new / changed samples
yarn embed --force  # re-embed all samples
```

Tunable via `ESTIMATE_EMBEDDING_MODEL` and `ESTIMATE_NEIGHBORS`.

## Confidence gate

Three independent uncertainty signals are combined into a single gate decision: vote `agreement`, neighbor-category `dispersion` (how scattered the neighbors' categories are on the ordinal scale), and the model's self-reported `confidence`. The gate trips when **any** signal is uncertain — agreement below `ESTIMATE_GATE_MIN_AGREEMENT` (0.5), dispersion above `ESTIMATE_GATE_MAX_DISPERSION` (0.5), or confidence below `ESTIMATE_GATE_MIN_CONFIDENCE` (medium).

When the gate trips the estimate is still written to Everhour exactly as usual (no regression), but the issue is additionally flagged for human review by applying the `estimate-needs-review` label, and the gate outcome plus neighbor distribution are surfaced in the audit comment for auditability. When the gate does not trip, behavior is unchanged.

Manual correction (via issue comment)

```md
/estimate 4h
```

Valid estimate values: `1h` (XXS), `2h` (XS), `4h` (S), `8h` (M), `16h` (L), `24h` (XL), `48h` (XXL).

## Workflows

Three GitHub Action workflows in `.github/workflows/` drive the estimation scripts. All require the `EVERHOUR_API_KEY` and `EVERHOUR_PROJECT_ID` secrets to be configured in the repository settings. The Issue Opened and Backfill workflows additionally require an `OPENAI_API_KEY` secret for the estimation inference call.

| Workflow                                                                     | Script            | Trigger                                  | Description                                                                                                                                     |
| ---------------------------------------------------------------------------- | ----------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Estimate - Issue Opened](../../.github/workflows/estimate-issue-opened.yml) | `src/issue.ts`    | Issue opened                             | Estimates the issue and posts an audit comment with the estimated hours.                                                                        |
| [Estimate - /estimate command](../../.github/workflows/estimate-command.yml) | `src/command.ts`  | Issue comment starting with `/estimate ` | Applies the manual correction and opens a pull request adding the correction as a new estimation sample under `.github/instructions/estimate/`. |
| [Estimate - Backfill](../../.github/workflows/estimate-backfill.yml)         | `src/backfill.ts` | Manual (`workflow_dispatch`)             | Backfills estimates for existing issues in the configured Everhour project, up to the optional `limit` input (defaults to 10).                  |

## Everhour task fields

Fields returned per task by the Everhour API (`GET /projects/{id}/tasks`). GitHub-linked tasks embed the issue's internal database ID in `id`; the issue number is resolved from `number` (or `url` as a fallback).

| Field         | Type             | Example                                                                       |
| ------------- | ---------------- | ----------------------------------------------------------------------------- |
| `id`          | string           | `"gh:498948741"` (`gh:<issue_database_id>` for GitHub-linked tasks)           |
| `name`        | string           | `"Cmd + Shift + H → Home"`                                                    |
| `type`        | string           | `"task"`                                                                      |
| `status`      | string           | `"open"` / `"closed"`                                                         |
| `url`         | string           | `"https://github.com/cybersemics/em/issues/76"`                               |
| `number`      | string           | `"76"` (GitHub issue number)                                                  |
| `projects`    | string[]         | `["gh:143808059"]` (repo ID)                                                  |
| `labels`      | string[]         | `["dependency-bug"]`                                                          |
| `assignees`   | object[] \| null | `[{ accountId: "gh:750276", accountName: "raineorshine", userId: 872373 }]`   |
| `completed`   | boolean          | `true`                                                                        |
| `completedAt` | string           | `"2019-10-07 02:16:55"`                                                       |
| `createdAt`   | string           | `"2019-09-26 15:09:11"`                                                       |
| `iteration`   | string           | Sprint/iteration ID                                                           |
| `estimate`    | object           | `{ type: "overall", total: 57600 }` (seconds; may include `users`)            |
| `time`        | object           | `{ total: 240900, users: { "872552": 240900 }, timerTime: 222900 }` (seconds) |

`estimate` and `time` only appear when set (most tasks omit them). `assignees` is `null` when unassigned.
