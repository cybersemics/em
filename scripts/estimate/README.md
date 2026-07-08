# Estimate

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
LIMIT=10 DRY_RUN=true yarn backfill

# Manual correction (via issue comment)
/estimate 4h
```

Valid estimate values: `1h` (XXS), `2h` (XS), `4h` (S), `8h` (M), `16h` (L), `24h` (XL), `48h` (XXL).
