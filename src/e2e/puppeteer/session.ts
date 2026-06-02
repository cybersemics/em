/* eslint-disable import/prefer-default-export */
import { Page } from 'puppeteer'

/**
 * The puppeteer `Page` the e2e helpers operate on — the single shared state holder for "the current
 * page". It knows nothing about how the page is produced; producers publish into it via `setPage`:
 *
 * - the **test fixture** (`setup.ts`) creates a fresh page per test and publishes it, and
 * - the **agent bridge** (`src/e2e/puppeteer/agents.ts`) binds the live tab it attached to.
 *
 * Helpers `import { page }` from here and use it as a live binding (ESM re-export semantics), so they
 * always see whatever the current producer published.
 */
export let page: Page

/** Publish the current page for the helpers to use. */
export const setPage = (currentPage: Page): void => {
  page = currentPage
}
