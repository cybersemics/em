Run this script to recalculate hashes.

## Setup

You will need to comment out `raw.macro` in `constants.ts` to be able to compile directly.

## Usage

```sh
npm run build

npm run start -- thoughts # rehash thoughts
npm run start -- contexts # rehash contexts
```

## Development

```
nodemon -w build/scripts/rehash/index.js -x "npm run start -- contexts data.json"
```
