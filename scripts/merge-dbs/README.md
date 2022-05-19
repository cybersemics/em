Merges **em** databases.

Handles old schema and reconstructs all thoughts.

## Build

```sh
npm run build
```

## Setup

1. Place backup dbs in a new directory.
2. Save a db with schema v5 as `db.json` in the same directory to serve as the base db. All backups will be merged into the base.

## Usage

```
node build/scripts/merge-dbs/index.js ~/em-backups/backups
```

- Reads all backup files in the specified directory.
- Reads the base db from `db.json`.
- Overwrites `db.json` with the merged db.
- Saves progress to `progress.json` after each backup is merged to enable resume.
