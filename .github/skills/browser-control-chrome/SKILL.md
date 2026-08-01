---
name: browser-control-chrome
description: >-
  Web (desktop) and Android (mobile Chrome) environment bring-up for driving the
  em app via the chrome-devtools MCP. Invoked by browser-control when the target
  is `web` or `android`; not normally called directly.
allowed-tools:
  - bash
  - chrome-devtools
  - wdio
---

This sub-skill brings up the **web** and **Android** environments. `browser-control` routes here when the caller's target is `web` or `android`. For iOS, see `browser-control-ios`.

The runner's setup phase has already started Xvfb, the Vite dev server, and a **shared Chrome** exposing a CDP endpoint on `:9222` (`node scripts/shared-chrome.mjs`). The `chrome-devtools` MCP is configured with `--browser-url=http://127.0.0.1:9222`, so it **attaches to that shared Chrome** instead of launching its own — which lets the web e2e bridge (`puppeteer.connect`) drive the *same* browser. Do **not** call `launch_chrome`. If a `chrome-devtools` call fails to connect, the shared Chrome isn't up — start it with `node scripts/shared-chrome.mjs` (it must be running before the MCP is used).

## Step 1: Emulation

### Target = `web` (desktop)

No emulation. Skip to Step 2.

### Target = `android` (mobile Chrome)

Apply mobile emulation **before any `navigate` call**. **em** checks the device's layout and interaction profile **once during launch**, so the first navigation must happen under the mobile profile or the initial render is wrong. Gestures also require touch, so the android profile is mandatory for gesture repros.

Call `chrome-devtools` `emulate` with a Pixel-class profile:

- `viewport`: `412x915x2.625,mobile,touch` — Pixel 7 dimensions in CSS px, DPR 2.625. The `mobile` flag triggers mobile media queries; `touch` delivers touch events instead of mouse events.
- `userAgent`: a current mobile Chrome UA, e.g. `Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36`.

If you have already navigated by mistake, re-apply emulation and re-navigate so the page loads cleanly under the mobile profile.

## Step 2: Navigate

The hub already probed the dev server, but confirm it is responsive before navigating. Vite now serves **HTTPS by default** (`@vitejs/plugin-basic-ssl`, self-signed); it only serves HTTP when started with `HTTP=1`. `-k` accepts the self-signed dev cert:

```bash
curl -fsSk -o /dev/null https://localhost:3000 || curl -fsS -o /dev/null http://localhost:3000
```

If neither responds, check `/tmp/dev-server.log` and report — do not start a second instance.

Navigate via `chrome-devtools` `navigate` to `https://localhost:3000` (or `http://` if the server was started with `HTTP=1`). The shared Chrome is launched with `--ignore-certificate-errors` (see `scripts/shared-chrome.mjs`), so the self-signed dev cert is **auto-accepted** — you should not see a certificate interstitial. If one ever appears (e.g. Chrome launched without the flag), type `thisisunsafe` while focused on the warning page to bypass it.

The React bundle hydrates a few seconds after `navigate` returns; reaching for interactions immediately hits an empty `<div id="root">`. Wait for a known landmark before any interaction — `#skip-tutorial` (welcome screen) or `[aria-label="empty-thoughtspace"]` (tutorial dismissed). Poll with `evaluate_script` between short `sleep`s until one is present.

After navigation, hand back to the caller. To drive em's own interactions, see **Driving em via the e2e bridge** below.

## Driving em via the e2e bridge

em's own interactions — gestures, editing, text selection, thought manipulation — are driven by the **canonical e2e helpers** in `src/e2e/puppeteer/helpers/`, executed against the shared Chrome via `attachExistingBrowserInstance()` in `src/e2e/puppeteer/attachExistingBrowserInstance.ts`. They are the same helpers the puppeteer test suite uses; do not re-derive interaction logic (synthetic touch dispatch, gesture cadence) in prose or inline — see `browser-control`'s "Driving em interactions".

**How it works.** `attachExistingBrowserInstance()` (in `src/e2e/puppeteer/attachExistingBrowserInstance.ts`) does `puppeteer.connect` to the shared Chrome (the same one the MCP drives via `--browser-url`), finds the live em tab, and binds it as the helpers' `page`. A puppeteer connection restores `page.touchscreen` (real CDP touch) that the chrome-devtools MCP tool surface doesn't expose — so the real `gesture.ts` runs, identical to the test suite.

**To run an interaction:**

1. Write a **temp** snippet — e.g. `/tmp/em-bridge.ts` — typed TypeScript that imports `attachExistingBrowserInstance` and the helpers you need **by absolute path** (the repo root is your working directory), composes them inside an async `main()`, and prints any result as JSON. **Disconnect, never close** (the MCP shares this Chrome). Glue only — never reimplement helpers. Wrap in `main()`; `tsx` runs the temp file as CommonJS, so top-level `await` is not available.

   ```ts
   import { attachExistingBrowserInstance } from '<repo>/src/e2e/puppeteer/attachExistingBrowserInstance'
   import gesture from '<repo>/src/e2e/puppeteer/helpers/gesture'

   const main = async () => {
     const { browser, page } = await attachExistingBrowserInstance()
     try {
       await gesture('rd') // real CDP touch via page.touchscreen
       console.log(JSON.stringify(await page.evaluate(() => document.querySelectorAll('[data-editable]').length)))
     } finally {
       await browser.disconnect() // never close — the MCP shares this Chrome
     }
   }
   main().catch(e => { console.error(e); process.exit(1) })
   ```

2. Run it with `npx tsx /tmp/em-bridge.ts`. Gestures need the android (touch) profile from Step 1. The temp file is never committed — delete it when done.

**Tapping any em control goes through the `click` helper** (`src/e2e/puppeteer/helpers/click.ts`) — `click('[data-testid="toolbar-icon"][aria-label="Export"]')`, `click('<thought-selector>')`. It calls `page.tap` under mobile emulation and `page.click` on desktop. **A raw `page.click` / MCP `click` / `elementHandle.click()` silently no-ops on a touch-emulated page** because em's controls fire on `fastClick`'s touch events — you'll see no error and wrongly conclude the control is broken. A tap is not "mechanical" just because it's a tap; if it's em's UI, use the helper (see `browser-control`'s **Driving em interactions**).

**If no helper covers the interaction**, drive it directly with the `chrome-devtools` MCP and keep going — reproduction is exploratory and must not be blocked. (Note the gap as a candidate helper for `src/e2e/puppeteer/helpers/` if you like, but don't wait on it.) Only avoid hand-reimplementing the internals of a helper that already exists.

## Cleanup

No required cleanup — the shared Chrome terminates with the environment. To start over with a clean profile mid-session: `localStorage.clear(); location.reload();` in the page console is normally enough. Re-apply `emulate` if you reset the profile.
