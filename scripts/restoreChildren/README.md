Restore missing children by traversing all lexemes in an exported em db.

Outputs two files:

- [filename].repaired.json
- [filename].formatted.json

## Build

```sh
npm run build
```

Watch:

npm run build -- --watch

## Usage

```sh
npm run start [filename]
```

Input data is formatted and written to disk for easy diffing:

```sh
git diff [filename].formatted.json [filename].repaired.json
```

Dry Run:

npm run start [filename] -- --dry

## Example

```sh
npm run start /Users/raine/Documents/Backups/em,\ Workflowy/2021-03-25T07_48_47Z_em-proto_data.json
```

Input data is formatted and written to disk for easy diffing:

```sh
git diff "/Users/raine/Documents/Backups/em, Workflowy/em-proto-KB6Go0pfKJeoBmOheF1wJwXowbP2-export - 06-04-21.formatted.json" "/Users/raine/Documents/Backups/em, Workflowy/em-proto-KB6Go0pfKJeoBmOheF1wJwXowbP2-export - 06-04-21.repaired.json"
```
