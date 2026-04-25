---
name: puppeteer-update-snapshots
description: Regenerate Puppeteer image snapshots using Docker. Use this skill when Puppeteer tests fail due to missing or outdated snapshots. Only use if the UI change was intentional, matches the user’s request or if you otherwise deem it to be necessary. NEVER use this skill to mask legitimate failures. ALWAYS explain to the user why you felt you needed to update snapshots.

allowed-tools:
  - bash
---

# Update Puppeteer Snapshots

Regenerate all Puppeteer image snapshots to match the current UI.

## Command

```bash
GITHUB_ACTIONS="" yarn test:puppeteer --update
```

This runs the full Puppeteer test suite with the `--update` flag, which:
1. Creates any missing snapshot files
2. Overwrites existing snapshots with the current UI rendering
3. Uses the same Docker + Vite setup as normal test runs

## When to use

- When Puppeteer tests fail with "New snapshot was not written. The update flag must be explicitly passed to write a new snapshot."
- When Puppeteer tests fail with image mismatch errors after intentional visual/UI changes.
- After deleting outdated snapshot files that need regeneration.

## After running

1. Verify the updated snapshot files exist in `src/e2e/puppeteer/__tests__/__image_snapshots__/`.
2. Commit the new/updated snapshot `.png` files.
3. Push and verify CI passes.

## Important

- Do NOT manually edit or create snapshot PNG files. Always use this command to regenerate them.
- Do NOT delete snapshot files as a fix for test failures. Run this command instead, which handles both missing and outdated snapshots.
- Do NOT run without unsetting `GITHUB_ACTIONS` -- the script will skip Docker and server setup.
- ALWAYS explain to the user why you felt you needed to update snapshots.