---
title: "On an insecure origin, three unrelated-looking failures have one cause"
date: 2026-09-17
category: persistence
module: persistence
problem_type: developer_experience
component: frontend
severity: medium
applies_when:
  - The Share button downloads a file instead of opening a share sheet
  - Thoughts do not survive a reload on a tester's device but do on yours
  - Every page load writes as a new replica and updatedBy stops identifying a device
  - A report comes from a LAN IP, a staging host, or a browser pointed at a plain-HTTP dev server
  - Reproducing any of the above before reading the code
tags:
  - secure-context
  - opfs
  - share
  - clientid
  - triage
  - dev-server
  - https
---

# On an insecure origin, three unrelated-looking failures have one cause

## Context

`navigator.share`, `navigator.storage.getDirectory` and `crypto.subtle` are all secure-context-only. Off a secure origin each is simply `undefined` or unavailable, and em reads that absence as permission to take a fallback branch — in three different subsystems, none of which surfaces anything a tester on a phone can read:

| API | Where em reaches it | Off a secure origin |
| --- | --- | --- |
| `navigator.share` | [`share`](../../../src/device/share.ts) | returns `false`, and `onExportClick` in [`Export.tsx`](../../../src/components/modals/Export.tsx) reads `false` as "download instead" |
| `navigator.storage.getDirectory` | the `type: 'opfs'` storage built by `getTreecrdtClientOptions` in [`runtime.ts`](../../../src/data-providers/treecrdt/runtime.ts) | the client takes its `fallback: 'memory'` path and the session runs in RAM |
| `crypto.subtle` | `clientIdReady` in [`thoughtspaceSession.ts`](../../../src/data-providers/thoughtspaceSession.ts) | `clientId` becomes a fresh `nanoid()` per page load |

[The TreeCRDT client](../../persistence.md#the-treecrdt-client) documents the memory fallback, its `console.warn`, [`storageStatusStore`](../../../src/stores/storageStatus.ts) and the Settings probe. The delta this file adds is the cause: an insecure origin is not in the list of reasons that fallback fires, in that section or in [Thoughtspace storage](../../testing.md#thoughtspace-storage), which names private browsing alone.

#4293 is what this costs. A tester reported the Share button downloading the export instead of opening the share sheet; the maintainer could not reproduce it. The tester came back with an iPhone 14 PM, an iPhone 16e and a Samsung A56, with a video capture on each. Three weeks later it was closed as no longer reproducible with the launch of HTTPS on main — #4465, which moved the dev server to HTTPS and touched neither `share.ts` nor `Export.tsx`. The app was never wrong. Nobody questioned the origin.

`localhost` is a secure context whatever the scheme, so the developer running `yarn start` never sees any of this, and neither does anyone on production.

## Guidance

**Confirm the origin before investigating.** `window.isSecureContext` in the console settles all three symptoms in one line. On a device with no reachable console, **Settings → Test storage** — the control [`persistence.md`](../../persistence.md#the-treecrdt-client) calls Storage Diagnostics — runs the OPFS probes in [`Settings.tsx`](../../../src/components/modals/Settings.tsx) and prints `client.storage` alongside them; `OPFS getDirectory: FAILED` with `client.storage: memory` is the same answer.

Neither surface names the origin itself. The Settings report ends with `userAgent`, and the [debug log](../../debug-log.md) header carries device, user agent, version and commit — a log attached to an issue therefore says which phone the reporter used and not which scheme they loaded. `window.isSecureContext` in one of those two headers is what would have made #4293 answerable from the attachments.

**The identity leg is the one with no signal at all.** `nanoid()` defaults to 21 characters, so the fallback `clientId` never satisfies the `clientId.length === 44` base64 test in `clientIdToReplicaId` ([`runtime.ts`](../../../src/data-providers/treecrdt/runtime.ts)) and is padded into the 32-byte replica id as raw UTF-8 instead. Every reload is a different replica writing into the same document, and `updatedBy` stops identifying a device. See the glossary for [clientId](../../glossary.md#c), [replicaId](../../glossary.md#r), [accessToken](../../glossary.md#a) and [tsid](../../glossary.md#t).

What does *not* break: `accessToken` is a `localStorage` nanoid, stable across reloads on any origin, and [permissionsStore](../../persistence.md#identity--sharing) is keyed by access token — so device permissions still resolve. And [Identity & sharing](../../persistence.md#identity--sharing) states `clientId = SHA-256(accessToken)` as an invariant that `clientIdReady` does not guarantee; repairing that sentence is [`docs-sync`](../../../.github/skills/docs-sync/SKILL.md)'s job, not this file's.

**Where the trap still lives.** Dev and production are both HTTPS — `const useHttps = !process.env.HTTP` in [`vite.config.ts`](../../../vite.config.ts) — and [`README.md`](../../../README.md) already points Capacitor LAN setup at `https://192.168.x.x:3000`. What survives is the opt-out: `yarn start:http` ([`package.json`](../../../package.json)) sets `HTTP=1` *and* passes `--host`, so the plain-HTTP server is reachable from every device on the network, which is exactly the configuration a tester is handed. Any non-HTTPS staging or LAN host does the same.

The Tauri desktop shell points `beforeDevCommand` at `yarn start:http` and `devUrl` at `http://localhost:3000` on purpose ([a blank Tauri window is the dev server's self-signed certificate](../build/tauri-blank-window-self-signed-cert.md)) and is unaffected, because `http://localhost` is still a secure context.

## Why This Matters

Each of the three failures is individually plausible as an app bug, and each has a genuine neighbour to be mistaken for: the storage one looks like Safari Private Browsing, which really does disallow OPFS ([Thoughtspace storage](../../testing.md#thoughtspace-storage)); the share one looks like the iOS keyboard bug #4294, on the same handler. Nothing is thrown, and nothing is logged where a tester can read it.

The asymmetry is the point. Checking `window.isSecureContext` costs one line and one round trip. Not checking it cost #4293 three weeks and three physical devices, and the fix, when it arrived, was in `vite.config.ts`.

## When to Apply

- Any report of the Share button downloading, of thoughts vanishing on reload, or of sync or identity behaving as though the device were new each time — **before** opening the subsystem.
- Any report from a device that is not yours, where the URL is not in the report. A device list is not an origin.
- Before reproducing against `yarn start:http`, or against a staging host whose scheme you have not checked.
- Not for a Capacitor build: `share` branches on `Capacitor.isNativePlatform()` first, so the native dialog is reached without `navigator.share` being consulted at all. A native share report is a different investigation.
- Not for CI, which sets `HTTP=1` but reaches the browser through the Cloudflare tunnel's TLS ([Cloudflare tunnel for the dev server](../../testing.md#cloudflare-tunnel-for-the-dev-server)), so the browser-facing origin is secure.
- Not for Safari Private Browsing, which fails the storage leg only and for its own reason.

## Examples

**Chasing it in the code that had the symptom.** #4293 was worked entirely as an Export/share bug: three devices, three videos, a maintainer running the same steps and getting the correct behaviour. The disagreement between the two results was the evidence — one origin was secure and one was not — and it was read as a device difference instead.

**The near-miss.** #4339 fixed a real bug on the very handler under suspicion — the iOS software keyboard overlapping the native share sheet, #4294, whose `isIOS` branch and its reasoning sit in `onExportClick` today. That branch runs before `share` is called, and on an insecure origin `share` returns `false` without a sheet ever existing. A fix landing on the same handler is not evidence that the handler was the problem.

## Related

- #4293, #4465, #4339
- [The TreeCRDT client](../../persistence.md#the-treecrdt-client) — the storage table, the OPFS→memory fallback, the warning, and the Settings diagnostics control.
- [Identity & sharing](../../persistence.md#identity--sharing) — `accessToken`, `clientId`, `tsid`, `permissionsStore`, and `clientIdToReplicaId`.
- [Thoughtspace storage](../../testing.md#thoughtspace-storage) — the existing list of reasons persistence falls back to memory.
- [The dev server serves HTTPS](../../agents/environment.md#the-dev-server-serves-https) — the `HTTP=1` escape hatch, and why nothing should hard-code the scheme.
- [A blank Tauri window is the dev server's self-signed certificate](../build/tauri-blank-window-self-signed-cert.md) — why the desktop shell opts out of HTTPS, and why that is safe.
