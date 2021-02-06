Run this script to recalculate contextIndex and thoughtIndex hashes.

## Setup

You will need to comment out `raw.macro` in `constants.ts` to be able to compile directly with tsc.

## Build

```sh
npm run build
```

## Usage

```sh
Usage: npm run start -- [subcommand] em-proto-m93daff2.json

Subcommands: contexts, thoughts, format

Outputs to a file with a ".[subcommand]" suffix.

```
