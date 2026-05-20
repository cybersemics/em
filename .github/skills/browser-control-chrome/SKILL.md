---
name: browser-control-chrome
description: >-
  Web (desktop) and Android (mobile Chrome) environment bring-up for driving the
  em app via the chrome-devtools MCP. Invoked by browser-control when the target
  is `web` or `android`; not normally called directly.
allowed-tools:
  - bash
  - chrome-devtools
---

This sub-skill brings up the **web** and **Android** environments. `browser-control` routes here when the caller's target is `web` or `android`. For iOS, see `browser-control-ios`.

The runner's setup phase has already started Xvfb and the Vite dev server. Chrome is **not** pre-launched — it boots when the `chrome-devtools` MCP makes its first call. Do not start Chrome yourself; just call the MCP. Do **not** call `launch_chrome` (that path is for a separate, manually-managed Chrome).

## Step 1: Bring up

### Target = `web` (desktop)

No emulation. The first `chrome-devtools` call (e.g. `navigate`) launches Chrome with a desktop default viewport (1280×1024 from Xvfb). Skip to Step 2.

### Target = `android` (mobile Chrome)

Apply mobile emulation **before any `navigate` call** — the MCP keeps a persistent Chrome, so the first navigation must happen under the mobile profile or the initial render is wrong.

Call `chrome-devtools` `emulate` with a Pixel-class profile:

- `viewport`: `412x915x2.625,mobile,touch` — Pixel 7 dimensions in CSS px, DPR 2.625. The `mobile` flag triggers mobile media queries; `touch` delivers touch events instead of mouse events.
- `userAgent`: a current mobile Chrome UA, e.g. `Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36`.

If you have already navigated by mistake, re-apply emulation and re-navigate so the page loads cleanly under the mobile profile.

## Step 2: Navigate

The hub already probed the dev server, but confirm it is responsive before navigating (Vite may serve HTTP or HTTPS; `-k` accepts the self-signed dev cert):

```bash
curl -fsS -o /dev/null http://localhost:3000 || curl -fsSk -o /dev/null https://localhost:3000
```

If neither responds, check `/tmp/dev-server.log` and report — do not start a second instance.

Navigate via `chrome-devtools` `navigate` to `http://localhost:3000` (or `https://` if that is what responded). If you hit an HTTPS self-signed certificate error, use the `thisisunsafe` bypass to proceed.

The React bundle hydrates a few seconds after `navigate` returns; reaching for interactions immediately hits an empty `<div id="root">`. Wait for a known landmark before any interaction — `#skip-tutorial` (welcome screen) or `[aria-label="empty-thoughtspace"]` (tutorial dismissed). Poll with `evaluate_script` between short `sleep`s until one is present.

After navigation, hand back to the caller. For em gesture-zone swipes, use the `interaction-gestures` skill.

## Cleanup

No required cleanup — the Chrome instance terminates with the agent session. To start over with a clean profile mid-session: `localStorage.clear(); location.reload();` in the page console is normally enough. Re-apply `emulate` if you reset the Chrome profile.
