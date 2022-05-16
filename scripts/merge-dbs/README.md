Imports one em database into another.

## Build

```sh
npm run build
```

## Usage

- `node index.js [BASE_DB] [BACKUP_DB]`

```
node build/scripts/merge-dbs/index.js ~/em-backups/2022-05-16.json  ~/em-backups/backups\ 2021-01-01\ -\ 2021-01-31
```

Outputs two files:

- `em-proto-wWpM1PlkbFSbPTXzOvRwFwaHf052-export-contextIndex.json`
- 'em-proto-wWpM1PlkbFSbPTXzOvRwFwaHf052-export-thoughtIndex.json`
