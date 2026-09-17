---
title: Only listed extensions are precached, and a CSS url() asset is invisible otherwise
date: 2026-09-17
category: build
module: service_worker
problem_type: build_error
component: tooling
symptoms:
  - A background image is missing when the installed PWA is launched cold while offline
  - The same image loads correctly online, on the dev server, and on a warm relaunch
  - Nothing is logged and no build step warns
  - The asset is preloaded in the component that uses it, so it looks like it is cached
root_cause: config_error
resolution_type: config_change
severity: medium
tags:
  - pwa
  - service-worker
  - vite
  - precache
  - offline
  - assets
---

# Only listed extensions are precached, and a CSS url() asset is invisible otherwise

## Problem

The offline precache is exactly the files in the build output whose extension appears in the `injectManifest.globPatterns` allowlist in [`vite.config.ts`](../../../vite.config.ts) — `['**/*.{js,mjs,wasm,css,html,webp,woff2}']`. VitePWA runs in `injectManifest` mode against [`src/service-worker.ts`](../../../src/service-worker.ts), where `precacheAndRoute(self.__WB_MANIFEST)` caches whatever that glob matched. Workbox globs the Vite `outDir` and nothing else, so there is no second way in: a bundled asset with an off-list extension is left out as surely as one copied verbatim from `public/`. See [Folder Structure → Load-bearing top-level files](../../folder-structure.md#load-bearing-top-level-files) for what that file and [`serviceWorkerRegistration.ts`](../../../src/serviceWorkerRegistration.ts) are.

The list omits `avif`. An image reached only through a `url()` string in a style object — `backgroundImage: 'url(/img/…)'` — has nothing else to fall back on: the string is never resolved at build time, so there is no import for the bundler to follow and no warning to emit.

What that leaves in the current tree:

| Format | Files in `public/` | In the precache | Offline on a cold launch |
| --- | --- | --- | --- |
| `woff2` | 7 | yes | yes |
| `webp` | 2 | yes, since #3850 | yes |
| `png` | 7 | no | only if fetched once online, and evictable |
| `avif` | 14 | **no** | **no** |
| `svg`, `ico` | 1 each | no | no |

`public/wa-sqlite` holds only the `.js` and `.mjs` loaders; the `treecrdt` plugin deletes any `.wasm` it finds beside them, because the binaries go through Vite's asset graph and are emitted into the build output with content hashes, where `wasm` in the same glob picks them up. See [Persistence → The TreeCRDT client](../../persistence.md#the-treecrdt-client) for what emits them.

The `.avif` row is the live failure: all fourteen live under `public/img/` — six sidebar overlay layers, three dialog glows, the gesture-menu glow, and four background glows behind the debug picker in [`Footer.tsx`](../../../src/components/Footer.tsx) — and each is reached from a `url()` string in [`SidebarGlow.tsx`](../../../src/components/Sidebar/SidebarGlow.tsx), [`dialogRecipe.ts`](../../../src/recipes/dialogRecipe.ts), [`GestureMenu.tsx`](../../../src/components/GestureMenu/GestureMenu.tsx) or [`BackgroundGlow.tsx`](../../../src/components/BackgroundGlow.tsx). Nothing precaches them and no route falls back for them.

The `.png` row is weaker, and it is the reason the trap holds. [`src/service-worker.ts`](../../../src/service-worker.ts) carries a CRA-boilerplate runtime route — `url.pathname.endsWith('.png')` under `StaleWhileRevalidate`, `cacheName: 'images'`, `ExpirationPlugin({ maxEntries: 50 })` — so `public/img/command-center/active-glow.png` and `public/img/scroll-zone/stardust.png` survive offline once they have been fetched at least once online, until the 50-entry LRU evicts them. They are never precached, so a cold launch on a fresh install still has nothing. The comment above that route reads as though `public/` images are handled in general — "same-origin .png requests like those from in public/" — and they are not. It is a second extension allowlist, in a second file, and neither file mentions the other.

Two further edges of the same shape:

- The `manifest.icons` entries in the same VitePWA block — `favicon.ico`, `android-chrome-192x192.png`, `android-chrome-512x512.png` — are outside the allowlist too. Same trap, different asset class.
- `maximumFileSizeToCacheInBytes` is set to 4 MiB beside the glob. An asset can match the glob and still be dropped from the manifest for being too large, silently. Nothing in `public/` is close today; the four `glow-*.avif` files are the largest at 1.2 MiB each.

## Symptoms

The failure is invisible in every environment a developer normally works in. Online production fetches the asset over the network. The dev server does not run the same service worker. A home-screen PWA keeps working on warm relaunches. Only a cold launch while offline reads from the precache alone, and that is the state #3623 was reported in: airplane mode on, WiFi off, em killed from the app switcher, then reopened — Command Center opens with its background gone.

Reproducing it locally needs its own recipe, because a PWA served by the live-reload dev server cannot be added to the Home Screen in fullscreen mode; it merely opens as a new Safari tab. From #3623:

1. [`yarn servebuild`](../../../README.md#deployment) to serve the production build.
2. Add to Home Screen from mobile Safari.
3. Kill the `servebuild` process and start the dev server on the same IP and port.
4. Open the installed app. The second kill-and-reopen clears the cache and serves the live-reload server.

## What Didn't Work

#3492 reported the Command Center background arriving late on first open, and the investigation landed on the right immediate cause — a CSS `background-image` is fetched lazily, when the element that uses it renders. #3550 shipped a preload for it in 402fd8bc8c: `HiddenOverlay`, an always-rendered `<div>` carrying the same `url()` behind `visibility: hidden`, still in [`CommandCenter.tsx`](../../../src/components/CommandCenter/CommandCenter.tsx).

That removed the flicker and did nothing whatever for the offline cache, because preloading moves bytes into the HTTP cache rather than into the precache manifest. #3623 is the same asset reopening the same symptom on a cold offline launch.

The preload was deliberately kept alongside the eventual glob fix rather than replaced — the service worker does not behave consistently in dev, so the preload is what prevents the flicker there. That leaves three decoys in the tree that all look like caching and none of which put an asset in the precache: `HiddenOverlay`, the `prefetchGlowBackground` effect in [`GestureMenu.tsx`](../../../src/components/GestureMenu/GestureMenu.tsx) that decodes `/img/gesture-menu/glow.avif` on mount, and [`usePrefetchImages`](../../../src/hooks/usePrefetchImages.ts), whose own doc comment says images are "decoded and cached by the time they are rendered" and which [`Sidebar.tsx`](../../../src/components/Sidebar/Sidebar.tsx) calls on all six sidebar overlay `.avif` files — the same six that are not in the precache. **Seeing a preload for an asset is not evidence that the asset is available offline.**

## Solution

#3850 added `webp` to `injectManifest.globPatterns`. A one-line diff, d580d967ca, which is the entire fix: `public/img/command-center/overlay.webp` now installs with the service worker instead of being fetched on first use.

`avif` was not added, and it has since become the dominant image format in `public/`. Adding it is the same one-line change.

## Why This Works

The precache is populated at install time from a static list, so an entry either exists before the device goes offline or it does not exist at all. Every runtime strategy — preload, prefetch, `StaleWhileRevalidate` — is conditional on a successful network fetch having already happened, which is exactly the condition a cold offline launch violates. That is why re-timing the fetch fixed #3492 and could not fix #3623, and why the `.png` route reads as a fix while leaving a fresh install with nothing.

## Prevention

- **Adding a file format to `public/` means adding its extension to `injectManifest.globPatterns`.** Nothing enforces this: `git log -S'globPatterns' -- vite.config.ts` returns exactly one commit in the repo's history (d580d967ca), no test or lint rule mentions the manifest, and the glob has no comment beside it saying it is an allowlist.
- **Run the gap directly.** This prints every extension present in `public/` that the glob cannot match:

  ```sh
  comm -23 \
    <(find public -type f | sed 's/.*\.//' | sort -u) \
    <(sed -n 's/.*globPatterns.*{\(.*\)}.*/\1/p' vite.config.ts | tr ',' '\n' | sort -u)
  ```

  Today it prints `avif`, `ico`, `png`, `svg`. It belongs in a review of any commit that touches `public/` or `vite.config.ts`.
- **Verify offline behaviour with the installed-PWA recipe above, not the dev server.** A `yarn start` session proves nothing about the precache, and a warm relaunch of the installed app proves nothing either.
- **Do not accept a preload as an offline fix.** If the report says "offline", the change belongs in `globPatterns` or in a Workbox route, not in a component.

## Related

- #3492, #3550 — the first-render flicker and the preload that fixed it without touching the cache.
- #3623, #3850 — the same asset missing on a cold offline launch, and the one-line glob fix.
- [Folder Structure → Load-bearing top-level files](../../folder-structure.md#load-bearing-top-level-files) — what [`service-worker.ts`](../../../src/service-worker.ts) and [`serviceWorkerRegistration.ts`](../../../src/serviceWorkerRegistration.ts) are.
- [Persistence → The TreeCRDT client](../../persistence.md#the-treecrdt-client) — the wa-sqlite assets emitted for `public/wa-sqlite`, the other class of asset that reaches the precache only because its extension happens to be on the list.
- [`README.md` → Deployment](../../../README.md#deployment) — `yarn build` and `yarn servebuild`.
