# Estimate

AI-powered issue estimation for the `em` project. Analyzes GitHub issues, assigns a t-shirt-size effort estimate, and syncs the estimated hours to Everhour.

## Setup

Define env variables in `scripts/estimate/.env`:

```
EVERHOUR_API_KEY=
EVERHOUR_PROJECT_ID=
```

## Usage

```bash
# Backfill (dry run)
cd scripts/estimate
yarn backfill --dry 10
```

Dry-run flags: `--dry` skips both the model call and the Everhour write; `--dry-ai` skips only the model call; `--dry-everhour` skips only the Everhour write.

Manual correction (via issue comment)

```md
/estimate 4h
```

Valid estimate values: `1h` (XXS), `2h` (XS), `4h` (S), `8h` (M), `16h` (L), `24h` (XL), `48h` (XXL).

## Workflows

Three GitHub Action workflows in `.github/workflows/` drive the estimation scripts. All require the `EVERHOUR_API_KEY` and `EVERHOUR_PROJECT_ID` secrets to be configured in the repository settings.

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
