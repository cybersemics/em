# Data Storage / Persistence

The persistence layer has three tiers: an in-memory Redux cache, a local Yjs CRDT store backed by IndexedDB, and a Hocuspocus-based websocket server backed by MongoDB. Thoughts and Lexemes flow between them via dedicated push and pull queues.

## In-memory state (Redux)

Thoughts live in `state.thoughts.thoughtIndex` (keyed by `ThoughtId`) and `state.thoughts.lexemeIndex` (keyed by hashed value). Only thoughts that are visible (cursor + ancestors + expanded children + context view) are loaded into state — the rest are pulled on demand and freed when no longer needed.

## Local persistence (Yjs + y-indexeddb)

Each thought's children are stored in their own `Y.Doc`, and each Lexeme is stored in its own `Y.Doc`. Docs are persisted locally with [`y-indexeddb`](https://github.com/yjs/y-indexeddb).

- [`src/data-providers/yjs/index.ts`](../src/data-providers/yjs/index.ts) — bootstraps the device's `accessToken` and `tsid` (thoughtspace id), derives `clientId` as a SHA-256 hash of the access token (used as `updatedBy` on every Thought/Lexeme write), and exposes `permissionsClientDoc` for the local share/permissions store.
- [`src/data-providers/yjs/thoughtspace.ts`](../src/data-providers/yjs/thoughtspace.ts) — the sync engine (~1,100 lines). Owns the in-memory caches of Y.Docs (`thoughtDocs`, `lexemeDocs`) and IndexedDB providers, and exports `replicateThought`, `replicateChildren`, `replicateLexeme`, `updateThought`, `updateLexeme`, `updateThoughts`, `freeThought`, `freeLexeme`, and `clear`. The default export is a [`DataProvider`](../src/data-providers/DataProvider.ts) named `db` that the rest of the app uses as its persistence handle.
- [`src/data-providers/yjs/documentNameEncoder.ts`](../src/data-providers/yjs/documentNameEncoder.ts) — encodes/decodes `tsid + docKey` into Y.Doc guids.

Thought and Lexeme fields are stored under single-letter keys (`v`, `r`, `m`, `p`, `l`, `u`, `a`, `c`, `x`) inside the Y.Map for compactness — see `thoughtKeyToDb` / `lexemeKeyToDb` in `thoughtspace.ts`.

## Remote sync (Hocuspocus + MongoDB)

The [`server/`](../server) subpackage runs a [`@hocuspocus/server`](https://tiptap.dev/hocuspocus) instance behind Express, with optional Redis horizontal scaling and Prometheus metrics. MongoDB document storage is provided via [`y-mongodb-provider`](https://github.com/raineorshine/y-mongodb-provider). Entry point: [`server/src/index.ts`](../server/src/index.ts).

Note: the websocket *client* connection from the app to this server is currently inert on `main` — `thoughtspace.ts` retains `thoughtWebsocketSynced` / `lexemeWebsocketSynced` maps and `remote: true` plumbing, but no `WebsocketProvider`/`HocuspocusProvider` is constructed. Local IndexedDB is the only active persistence path on this branch.

## Push queue (Redux → Yjs)

[`src/redux-enhancers/pushQueue.ts`](../src/redux-enhancers/pushQueue.ts) is a store enhancer that drains `state.pushQueue` after every action. It separates batches into:

- **dbQueue** — batches with `local || remote` set, applied sequentially via `db.updateThoughts({ thoughtIndexUpdates, lexemeIndexUpdates, lexemeIndexUpdatesOld, schemaVersion })`. `idbSynced` callbacks resolve once writes hit IndexedDB.
- **freeQueue** — state-only batches whose `null` updates trigger `db.freeThought` / `db.freeLexeme` to release Y.Docs from memory.

It also caches a small set of critical settings (`CACHED_SETTINGS`) into `localStorage` so they're available before Yjs hydrates.

## Pull queue (Yjs → Redux)

[`src/redux-middleware/pullQueue.ts`](../src/redux-middleware/pullQueue.ts) is middleware that, after each action, recomputes the set of visible `ThoughtId`s (cursor + ancestors + `state.expanded` + context-view contexts), debounces (10 ms) and throttles (100 ms), then dispatches the [`pull`](../src/actions/pull.ts) action to fetch any pending ids via `db.getThoughtById` (which calls `replicateThought` under the hood). Concurrent pulls are deduped via a `pulling` set, and a `cancelRef` cancels the previous in-flight pull when the cursor moves. On the first flush it also pulls the `=favorite` Lexeme and its contexts.

## Identity & sharing

`accessToken`, `tsid`, and `clientId` are exported from [`yjs/index.ts`](../src/data-providers/yjs/index.ts) and stamped on every write via `updatedBy`. URL params `?share=<tsid>&auth=<token>` switch the app onto a shared thoughtspace. Permissions for a thoughtspace live in `permissionsClientDoc` and are managed by [`permissionsModel.ts`](../src/data-providers/yjs/permissionsModel.ts); UI components subscribe to Yjs types via [`useSharedType.ts`](../src/hooks/useSharedType.ts).
