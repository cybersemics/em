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

# Manual correction (via issue comment)
/estimate 4h
```

Valid estimate values: `1h` (XXS), `2h` (XS), `4h` (S), `8h` (M), `16h` (L), `24h` (XL), `48h` (XXL).

## Workflows

Three GitHub Action workflows in `.github/workflows/` drive the estimation scripts. All require the `EVERHOUR_API_KEY` and `EVERHOUR_PROJECT_ID` secrets to be configured in the repository settings.

- **[Estimate - Issue Opened](../../.github/workflows/estimate-issue-opened.yml)** — Runs when a new issue is opened. Estimates the issue and posts an audit comment with the estimated hours (`src/issue.ts`).
- **[Estimate - /estimate command](../../.github/workflows/estimate-command.yml)** — Runs when an issue comment starting with `/estimate ` is created. Applies the manual correction and opens a pull request adding the correction as a new estimation sample under `.github/instructions/estimate/` (`src/command.ts`).
- **[Estimate - Backfill](../../.github/workflows/estimate-backfill.yml)** — Manually triggered via `workflow_dispatch`. Backfills estimates for existing issues in the configured Everhour project, up to the optional `limit` input (defaults to 10) (`src/backfill.ts`).
