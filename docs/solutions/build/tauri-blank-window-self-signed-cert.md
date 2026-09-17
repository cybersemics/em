---
title: "A blank Tauri window is the dev server's self-signed certificate"
date: 2026-09-17
category: build
module: dev_server
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - "`yarn tauri:dev` opens a white window with nothing in it"
  - The desktop shell shows nothing while the same build loads fine in a browser
  - Editing which server or scheme the desktop shell points at
  - Copying a certificate workaround from the Android or iOS shell to Tauri
tags:
  - tauri
  - desktop
  - https
  - self-signed
  - wkwebview
  - dev-server
---

# A blank Tauri window is the dev server's self-signed certificate

## Context

The desktop shell in development loads the same Vite server a browser does, and that server is HTTPS with a self-signed certificate — see [The dev server serves HTTPS](../../agents/environment.md#the-dev-server-serves-https) for the mechanism and the `HTTP=1` opt-out. A browser meets that certificate with an interstitial you click through once. A native webview meets it with a failed navigation: the window paints white, and nothing in the app reports it because the document that would have done the reporting never loaded. The symptom is indistinguishable from a crash before first render, which is where the investigation goes.

Each of em's three native shells answers that certificate somewhere different, and only the desktop one answers it on the server. Android and iOS each get a seam from the webview — the `WebViewClient` in [`DevServerWebViewClient`](../../../android/app/src/main/java/com/emtheapp/em/DevServerWebViewClient.java), the Capacitor auth-challenge hook in [`DevServerViewController.swift`](../../../ios/App/App/DevServerViewController.swift) — and each explains itself where it lives, behind a debug-only gate. Tauri offers no equivalent: [`desktop/src/lib.rs`](../../../desktop/src/lib.rs) is a stock `tauri::Builder::default()` with one unrelated plugin, and #4513 found no way to answer or ignore the TLS challenge from app code at all, leaving manual Keychain trust as the only client-side route — not something a checkout can ship.

## Guidance

The desktop shell moves the problem to the server instead. Two lines in [`desktop/tauri.conf.json`](../../../desktop/tauri.conf.json) are a pair:

```json
"beforeDevCommand": "yarn start:http",
"devUrl": "http://localhost:3000",
```

`start:http` is `HTTP=1 vite --host --port 3000` in [`package.json`](../../../package.json). Point either line back at HTTPS on its own and the window goes blank again.

**Let `tauri:dev` own the server.** If `yarn start` is already holding port 3000, `yarn tauri:dev` still blanks, and `beforeDevCommand` running is what disguises it: the `start:http` it runs passes `--port 3000` without `--strictPort`, so the plain-HTTP server steps aside to the next free port while `devUrl` stays pointed at 3000, where the HTTPS server tauri did not start is still listening. Either start nothing yourself, or run `yarn start:http` first and let tauri attach to it.

**Check the server before the app.** One request settles it from outside the shell:

```bash
curl -fsS -o /dev/null http://localhost:3000 && echo "plain HTTP" || echo "not plain HTTP on 3000"
```

**Dropping to HTTP costs nothing here.** `localhost` is a secure context whatever the scheme, so the service worker still registers and every secure-context-only API the app reaches still works inside the Tauri webview. That guarantee is about `localhost` specifically — a LAN IP or a staging host over plain HTTP is a different situation, and [On an insecure origin, three unrelated-looking failures have one cause](../persistence/insecure-origin-silent-degradation.md) is what it looks like.

## Why This Matters

The failure produces no diagnostic of any kind, and the one place a developer would look — the page — is precisely the layer that never loaded. Everything about a white window says "app", and nothing about it says "TLS".

The second cost is the plausible wrong fix. Two shells in this repo do accept the self-signed certificate from app code, so "make the webview trust it" reads as a solved problem with a known shape, and the search for the Tauri equivalent ends in nothing rather than in an error message. Knowing in advance that the seam does not exist is what keeps that search short.

## When to Apply

- A blank `yarn tauri:dev` window — before opening any application code.
- Any edit to `beforeDevCommand`, `devUrl`, or the dev server's scheme: the two config lines change together or not at all.
- Not for a built desktop app. `frontendDist: ../build` serves the bundled web build from inside the bundle, so no dev server and no certificate is involved.
- Not for Android or iOS, which accept the certificate in their own debug builds and reach the HTTPS server directly.

## Examples

**The approach that was tried.** #4513 began by trying to keep the desktop shell on the HTTPS server, since every other client already lives with the certificate. It was rejected for lack of any hook: with no way to answer or ignore the challenge from app code, the only remaining route was asking every developer to trust the certificate in Keychain by hand. The shipped fix was the one-line switch to `yarn start:http` — merged into the desktop build's own branch rather than into main, so `beforeDevCommand: "yarn start"` never reached main at all, and #4474 arrived already carrying the fix.

**Why the config path in that thread no longer exists.** #4513 describes `src-tauri/tauri.conf.json`; the directory was renamed to `desktop/` by 2885723310. The values are unchanged — read them at [`desktop/tauri.conf.json`](../../../desktop/tauri.conf.json).

## Related

- #4513, #4474
- [The dev server serves HTTPS](../../agents/environment.md#the-dev-server-serves-https) — the certificate, the `HTTP=1` opt-out, and why nothing should hard-code the scheme.
- [Tauri desktop shell](../../drag-and-drop.md#tauri-desktop-shell) — the other setting in the same file that exists only because the webview is not a browser.
- [Cloudflare tunnel for the dev server](../../testing.md#cloudflare-tunnel-for-the-dev-server) — how the iOS Safari test path avoids the same certificate, with real TLS.
- [On an insecure origin, three unrelated-looking failures have one cause](../persistence/insecure-origin-silent-degradation.md) — what plain HTTP does cost, once the host is not `localhost`.
