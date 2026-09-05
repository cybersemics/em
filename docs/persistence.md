# Data Storage / Persistence

The persistence layer has three tiers:

1. **In-memory state** — Redux store (`state.thoughts.thoughtIndex` and `state.thoughts.lexemeIndex`), holding only thoughts that are currently visible.
2. **Local persistence** — a [TreeCRDT](https://github.com/cybersemics/treecrdt) operation log materialized into SQLite, running in the browser via [`@treecrdt/wa-sqlite`](https://www.npmjs.com/package/@treecrdt/wa-sqlite) and stored in OPFS.
3. **Remote sync** — TreeCRDT WebSocket sync ([`@treecrdt/sync`](https://www.npmjs.com/package/@treecrdt/sync)). **Opt-in** — see [Remote sync](#remote-sync-opt-in) below.

Two queues bridge Redux and the local TreeCRDT store:

- **Push queue** ([`redux-enhancers/pushQueue.ts`](../src/redux-enhancers/pushQueue.ts)) drains `state.pushQueue` after every action and writes to TreeCRDT.
- **Pull queue** ([`redux-middleware/pullQueue.ts`](../src/redux-middleware/pullQueue.ts)) tracks visible thoughts and pulls any pending ones from TreeCRDT.

The single point of integration with persistence is the [`DataProvider`](../src/data-providers/DataProvider.ts) interface, implemented by the active thoughtspace backend. [`data-providers/thoughtspace.ts`](../src/data-providers/thoughtspace.ts) exports both the active provider (`db`) and the `ThoughtspaceRuntime` that owns its lifecycle; today both are the TreeCRDT implementation.

## In-memory state (Redux)

Thoughts live in `state.thoughts.thoughtIndex` (keyed by `ThoughtId`) and `state.thoughts.lexemeIndex` (keyed by hashed value). Only thoughts that are *visible* — the cursor, its ancestors, `state.expanded` paths, and any context-view contexts and their ancestors — are held in memory. Everything else has either never been pulled or was freed after going off-screen.

Thoughts that are known to exist but haven't been loaded yet are flagged with `pending: true` so the UI can render placeholder rows while the pull queue fetches them.

## Local persistence (TreeCRDT + SQLite)

### The TreeCRDT client

[`treecrdt/runtime.ts`](../src/data-providers/treecrdt/runtime.ts) owns exactly one `TreecrdtClient`, created by `createTreecrdtClient` with `docId = tsid` and a storage mode chosen at startup:

| `ThoughtspaceStorage` | SQLite storage | Runtime |
|---|---|---|
| `'persistent'` (app default) | OPFS file `/treecrdt-em-${tsid}.db`, falling back to memory if OPFS is unavailable | `dedicated-worker` |
| `'memory'` (unit tests, most e2e) | in-memory | `direct` |

[`index.tsx`](../src/index.tsx) passes `testFlags.thoughtspaceStorage ?? 'persistent'`. If persistent storage was requested but the client came back with `storage === 'memory'`, the runtime logs a warning that changes will not survive a reload. `init` returns the storage the client actually opened, which [`initialize.ts`](../src/initialize.ts) puts in [`storageStatusStore`](../src/stores/storageStatus.ts); the Storage Diagnostics control in [`modals/Settings.tsx`](../src/components/modals/Settings.tsx) reports it alongside a live OPFS probe, so a browser that discards storage can be identified on a device with no reachable console. The wa-sqlite WASM assets are emitted into `public/wa-sqlite` by the `treecrdt` Vite plugin (see [`vite.config.ts`](../vite.config.ts)).

The client surface em uses:

- `client.tree` — the materialized read model: `children`, `parent`, `exists`, `getPayload`.
- `client.local` — local write ops minted for a replica id: `insert`, `move`, `delete`, `payload`. Each returns an `Operation`.
- `client.runner` — raw SQLite access, used for em's own derived tables.
- `client.onMaterialized` — subscription fired after ops are materialized into SQLite.
- `client.drop()` — closes the client and deletes the OPFS database file.

### Single-tab access

The thoughtspace is opened by a single tab at a time. [`sessionLock.ts`](../src/data-providers/treecrdt/sessionLock.ts) requests an exclusive [Web Lock](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) named `em-treecrdt-session:${tsid}` with `ifAvailable: true`; the lock callback deliberately never resolves, so the browser holds the lock for the lifetime of the page and releases it on close or navigation. Native (Capacitor) platforms always report `acquired`, since they cannot open a second tab; a browser without `navigator.locks` reports `unsupported`.

[`index.tsx`](../src/index.tsx) calls `thoughtspaceRuntime.acquireAccess()` *before* initializing or rendering the app. When access is blocked it renders [`ThoughtspaceInUse`](../src/components/ThoughtspaceInUse.tsx) instead, with copy that distinguishes `already-open` from `unsupported`.

### Document model

There is **one CRDT tree per thoughtspace**, not one document per parent thought:

- Each thought is a node in that tree, keyed by its `ThoughtId`. Parent/child structure and sibling order live in the tree itself.
- `GLOBAL_ROOT_TOKEN` is the tree root, and `ROOT_PARENT_ID` is defined as an alias for it ([`constants.ts`](../src/constants.ts)) — so the two names refer to the same node, and `treeParentId` is a no-op that documents the boundary. Reads go the other way: `getThoughtById` reports `ROOT_PARENT_ID` when the tree has no parent for a node.
- `SYSTEM_ROOT_THOUGHT_IDS` (`HOME_TOKEN`, `EM_TOKEN`, `ABSOLUTE_TOKEN`) are inserted as children of the global root during initialization, along with `[EM, 'Settings']` at the fixed `SETTINGS_TOKEN` — see `initializeThoughtspaceStorage` in [`treecrdt/thoughtspace.ts`](../src/data-providers/treecrdt/thoughtspace.ts).

Each node carries a payload: a JSON-encoded `ThoughtPayload` ([`payload.ts`](../src/data-providers/treecrdt/payload.ts)) with `value`, `created`, `lastUpdated`, `updatedBy`, and an optional `archived` timestamp. Everything else about a `Thought` is derived on read (see below). In particular **`rank`, `parentId`, and `childrenMap` are not stored in the payload.**

### Derived tables

Two app-owned tables live alongside the CRDT tables in the same SQLite database. Neither is part of the CRDT, so neither replicates; both are rebuilt or maintained locally.

- **`em_lexemes`** ([`lexemes.ts`](../src/data-providers/treecrdt/lexemes.ts)) — `id` (the `hashThought(value)` key) → `payload_json` (a serialized `Lexeme`). Lexemes are written by the push queue and refreshed from materialization events.
- **`em_attribute_children`** ([`attributeChildren.ts`](../src/data-providers/treecrdt/attributeChildren.ts)) — `child_id` → (`parent_id`, `value`) for `=attribute` children only, indexed by `parent_id`. This restores em's `childrenMap` contract, where meta-attributes are keyed by value rather than by id. A companion `em_attribute_children_meta` table records the index version; when it doesn't match `INDEX_VERSION`, `ensureAttributeChildrenIndexReady` rebuilds the index by walking the materialized tree once from the global root. After that it's maintained incrementally on every write and on every materialization batch.

### Reading a thought

`getThoughtByIdFromClient` assembles a `Thought` from the tree plus the attribute index:

- `value` / `created` / `lastUpdated` / `updatedBy` / `archived` come from the decoded payload.
- `parentId` is the tree parent, falling back to `ROOT_PARENT_ID` when the tree reports none.
- `rank` is the node's **index among its siblings** (`0` when it has no parent). It is a projection of the tree's order, computed per read, not a persisted field.
- `childrenMap` is built by `createIndexedChildrenMap`: attribute children are keyed by their value (via `childrenMapKey`, which disambiguates duplicates), all other children by their `ThoughtId`. Insertion order follows `client.tree.children`, so `Object.values(childrenMap)` is the authoritative sibling order.

`testFlags.replicationDelay` injects an artificial delay into `getThoughtsByIds`, used by e2e tests that need to observe slow local materialization after a refresh.

### Writes

`updateThoughtsForClient` applies one push-queue batch:

1. **Lexemes first.** Each entry in `lexemeIndexUpdates` is upserted into `em_lexemes`, or deleted when `null`.
2. **Deletions.** Each `null` entry in `thoughtIndexUpdates` becomes a `client.local.delete`, and the thought's row is dropped from the attribute index.
3. **Upserts.** For a thought that doesn't exist yet, a `client.local.insert` with a resolved placement (see below); for one that does, a `client.local.move` when the parent or the order changed, and a `client.local.payload` when any payload field actually changed. Redundant payload writes are skipped so no-op edits don't mint operations. The attribute index is updated whenever a thought's parent or value changed.

The function returns the `readonly Operation[]` it minted. That array is what the runtime forwards to remote sync.

`DataProvider.updateThoughts` is the public persistence entry point for push-queue thought and lexeme batches. Writes that arrive before the client is bound wait on a readiness promise; a failed initialization or a `drop` rejects those waiters so the next initialization starts clean.

#### Order and placement

TreeCRDT stores sibling order directly, so a reorder is a `move` with an explicit placement (`first`, `last`, or `after: <siblingId>`) rather than a new rank number.

`PushBatch.movePlacements: Index<ThoughtId | null>` carries that intent from the action layer: the key is the moved thought, the value is the sibling to place it after (`null` means first). It is produced by [`moveThought`](../src/actions/moveThought.ts), [`sort`](../src/actions/sort.ts), [`editThought`](../src/actions/editThought.ts), and the [undo/redo enhancer](../src/redux-enhancers/undoRedoEnhancer.ts). `moveThought` and `editThought` derive theirs from the rank they are about to write with [`getMovePlacement`](../src/selectors/getMovePlacement.ts), which names the last sibling ranked before it. `editThought` needs one because editing a value re-ranks the thought within a sorted context, and a rank that arrives without a placement leaves the stored order untouched.

`getTreecrdtPlacement` resolves it:

- A move of an existing thought **requires** an explicit placement and throws without one.
- A new insert, or a placement naming a sibling that is no longer there, falls back to `getRankPlacement`, which derives a placement from the thought's numeric `rank`.

The rank fallback is a compatibility bridge while the app still treats `rank` as the canonical display order. It carries a `TODO` to be removed once the create/import/`newThought` paths pass explicit placement and selectors read provider-backed order. See [data-model.md → rank](data-model.md#rank).

### Write barrier

[`writeBarrier.ts`](../src/data-providers/treecrdt/writeBarrier.ts) serializes em → TreeCRDT persistence and exposes an idle barrier. It is a local ordering guard, not a CRDT requirement: it keeps app-state refreshes from racing local persistence, so a materialization refresh can't reapply stale rows over newer optimistic state.

It also stamps every local write with a `writeId` of the form `em-local:${sourceId}:${n}`, where `sourceId` is unique per page load. `isTreecrdtLocalMaterialization` recognizes this tab's own writes by that prefix, so the materialization path can skip events the app already applied optimistically.

### Change observation (materialization)

`client.onMaterialized` fires after operations are materialized into SQLite — for remote ops arriving over sync as well as for local writes. Events whose changes all carry this tab's own `writeId` prefix are ignored, because the app already applied them optimistically. Everything else is handed to `enqueueMaterializedThoughtsToStore`, which serializes refreshes through [`materializationQueue.ts`](../src/data-providers/treecrdt/sync/materializationQueue.ts) so overlapping async events cannot apply out of order.

[`applyMaterializedThoughtsToStore`](../src/data-providers/treecrdt/sync/applyMaterializedThoughtsToStore.ts) then:

1. Waits for the write barrier.
2. Refreshes `em_attribute_children` from the change list.
3. Runs [`refreshThoughtsFromMaterializationChanges`](../src/data-providers/treecrdt/sync/materializationThoughtUpdates.ts), which loads the affected thoughts fresh from the provider, derives Lexeme updates (every touched thought adds itself to its value's Lexeme; deletions and value changes remove the stale context; a Lexeme left with no contexts is deleted), and re-projects TreeCRDT sibling order onto `rank` for every parent whose children changed — so the render path, which still sorts by rank, reflects remote reorders.
4. Persists the derived Lexeme updates, then applies the whole batch through the *materialization bridge*.

The bridge is supplied by [`initialize.ts`](../src/initialize.ts): `getSnapshot` reads the current Redux thought and lexeme indexes, and `apply` dispatches `updateThoughts` with `local: false, remote: false, repairCursor: true`. A thought's `pending` flag is preserved across the refresh, since it is UI state rather than part of the TreeCRDT payload.

### Memory management

`freeThought` / `freeLexeme` are **no-ops** in the TreeCRDT provider. The whole thoughtspace is a single SQLite database, so there is no per-document cache to release — freeing memory only means dropping entries from the Redux indexes, which the `freeQueue` half of the push queue already does. [`redux-middleware/freeThoughts.ts`](../src/redux-middleware/freeThoughts.ts) dispatches `freeThoughts` once `thoughtIndex` exceeds `globals.freeThoughtsThreshold`.

Deleting a thought is not a separate provider call: it is a `null` entry in `thoughtIndexUpdates`, handled by the write path above.

### Runtime lifecycle

`ThoughtspaceRuntime` ([`thoughtspace.ts`](../src/data-providers/thoughtspace.ts), implemented in [`treecrdt/runtime.ts`](../src/data-providers/treecrdt/runtime.ts)) exposes `acquireAccess`, `init`, `drop`, `waitForIdle`, and `persistPushQueueBatches`.

- **`init`** awaits `clientIdReady`, loads the permissions store, creates the client, binds it to the data provider (which seeds storage and subscribes to materialization), and finally tries to start WebSocket sync. It resolves to `{ clientId, storage }`, where `storage` is the storage the client actually opened rather than the one requested. `init` and `drop` are serialized on a single lifecycle tail, and adjacent `init` calls are coalesced, so teardown can never interleave with startup.
- **`waitForIdle`** alternates between the write barrier and the materialization queue until neither version counter changes, then resolves; it rejects after `TREECRDT_IDLE_TIMEOUT = 30000` ms. Puppeteer tests reach it through the [`waitForThoughtspaceIdle`](../src/e2e/puppeteer/helpers/waitForThoughtspaceIdle.ts) helper, which calls `em.testHelpers.waitForThoughtspaceRuntimeIdle`.

## Remote sync (opt-in)

Remote sync speaks the TreeCRDT sync protocol over a WebSocket ([`treecrdtWebSocketSync.ts`](../src/data-providers/treecrdt/sync/treecrdtWebSocketSync.ts)). It is **off unless `VITE_TREECRDT_SYNC_BASE_URL` is set**, and always skipped in test mode.

- The base URL may be a `ws://` / `wss://` endpoint or an `http(s)://` discovery URL ([`sync/config.ts`](../src/data-providers/treecrdt/sync/config.ts)).
- On start, `connectTreecrdtWebSocketSync` runs `syncOnce()` to catch up, then `startLive()` to subscribe.
- Outbound: `persistPushQueueBatches` forwards the `Operation[]` returned by each batch flagged `local` to `pushLocalOps`.
- Inbound ops are materialized by the client and reach Redux through the materialization path above.

Failures are non-fatal by design: a failed start logs a warning and em keeps running against local storage only; a failed `pushLocalOps` logs and moves on.

## Push queue (Redux → TreeCRDT)

[`redux-enhancers/pushQueue.ts`](../src/redux-enhancers/pushQueue.ts) is a Redux store enhancer that runs after every reducer. It drains `state.pushQueue` (a list of `PushBatch` objects pushed there by [`updateThoughts`](../src/actions/updateThoughts.ts) and friends) and partitions it into:

- **`dbQueue`** — batches with `local || remote` set. Applied sequentially through `thoughtspaceRuntime.persistPushQueueBatches`, which wraps them in the write barrier and calls the active data provider's `updateThoughts` with the batch's `thoughtIndexUpdates`, `lexemeIndexUpdates`, `lexemeIndexUpdatesOld`, and `movePlacements`. After provider persistence finishes, any `idbSynced` callback on the original batch is invoked.
- **`freeQueue`** — state-only batches whose `null` thought/lexeme entries indicate they should be released from the in-memory cache. Calls `db.freeThought` / `db.freeLexeme` (no-ops for TreeCRDT; the Redux-side release is what matters).

The enhancer also caches a small set of critical settings (`CACHED_SETTINGS` in [`constants.ts`](../src/constants.ts)) into `localStorage` so that things like the Tutorial setting are available during the first paint before the thoughtspace hydrates. The corresponding read path is [`selectors/getSetting.ts`](../src/selectors/getSetting.ts).

When [debug logging](../src/util/debugLog.ts) is enabled, each flush emits a `push` entry (batch count, thought/lexeme/move counts, and a sample of the thoughts written) and then either `pushSynced` or `pushError`. A `push` with no matching `pushSynced` is a write that never completed.

Once Redux dispatches a thought update, the data flow is therefore:

```
reducer → state.pushQueue → pushQueue enhancer
      → thoughtspaceRuntime.persistPushQueueBatches   (write barrier)
      → DataProvider.updateThoughts
      → TreeCRDT local ops + derived table writes
      → Operation[] forwarded to WebSocket sync (if connected)
      → idbSynced callback is invoked
```

## Pull queue (TreeCRDT → Redux)

[`redux-middleware/pullQueue.ts`](../src/redux-middleware/pullQueue.ts) runs after every action. It computes the set of currently visible `ThoughtId`s — cursor, all ancestors, `state.expanded`, plus context-view contexts and their ancestors — and short-circuits if nothing has changed since the last flush. Otherwise it kicks off a flush:

1. Debounce the visibility recompute by `updatePullQueueDelay = 10` ms.
2. Throttle the flush by `flushPullQueueDelay = 100` ms (skipped on first load and on `authenticate`).
3. Filter out IDs already being pulled via the `pulling: Set<Record<ThoughtId, true>>`.
4. Dispatch the [`pull`](../src/actions/pull.ts) thunk with the remaining IDs.
5. On the **first flush** only, also dispatch `pullFavorites` to load `=favorite` and its contexts.

When the cursor moves, the previous pull's `cancelRef.canceled` is set to `true`. Already-replicating thoughts complete; their not-yet-fetched descendants are left as pending and become the responsibility of the next flush.

`syncStatusStore.isPulling` tracks pull state for the UI (does not include the favorites pull, which runs in the background).

### `fetchDescendants` (the actual pull engine)

[`data-providers/data-helpers/fetchDescendants.ts`](../src/data-providers/data-helpers/fetchDescendants.ts) is an async iterable that does breadth-first traversal of thought IDs and yields `{ thoughtIndex, lexemeIndex }` chunks. The `pull` thunk dispatches each chunk into Redux via `updateThoughts` so the UI can paint partial results as the pull progresses.

Notable behavior:

- **Buffer depth.** Default `MAX_DEPTH = 100` in `fetchDescendants`, but `pull` passes `BUFFER_DEPTH = 2` for normal pulls. Beyond that depth, descendants are marked `pending: true` rather than fetched. `MAX_THOUGHTS_QUEUED = 100` is a hard cap on the BFS queue size.
- **Cursor priority.** On every loop iteration, if the cursor has become pending mid-pull, its head is prepended to the next batch, so cursor moves don't have to wait for the BFS to drain.
- **`=pin` pre-load.** For every thought yielded, if it has a `=pin` child, the pin and the pin's children are eagerly fetched in the same iteration to avoid a flash of expanded children before `=pin/false` resolves ([issue #3268](https://github.com/cybersemics/em/issues/3268)).
- **Tangential contexts.** If a thought's parent isn't loaded, the parent is pushed onto the queue so the ancestor chain gets pulled.
- **Meta attributes.** Descendants of `=`-prefixed thoughts (except `=archive`) are not buffer-truncated; they're always pulled in full so the metaprogramming layer behaves consistently.

## Identity & sharing

Three tokens are bootstrapped in [`data-providers/thoughtspaceSession.ts`](../src/data-providers/thoughtspaceSession.ts):

- **`accessToken`** — a per-device 21-char nanoid stored in `localStorage`. It is the device's secret: `clientId` is derived from it, and it keys the device's permissions entry. Nothing currently transmits it — the sync client connects without auth. Can be overridden by `?auth=<token>` in the URL.
- **`tsid`** — the thoughtspace ID. Also a 21-char nanoid in `localStorage`. It is the TreeCRDT `docId`, the OPFS filename (`/treecrdt-em-${tsid}.db`), the Web Lock name, and the permissions storage key. Can be overridden by `?share=<tsid>` to switch the app onto a shared thoughtspace.
- **`clientId`** — a public key derived as `SHA-256(accessToken)`, base64-encoded. Available asynchronously via the exported `clientIdReady` promise. Stamped on every Thought and Lexeme write as `updatedBy`, and converted by `clientIdToReplicaId` into the 32-byte replica id TreeCRDT mints local operations under.

Device permissions live in [`permissionsStore.ts`](../src/data-providers/permissionsStore.ts): a [ministore](glossary.md#m) holding `Index<Share>` keyed by access token (one entry per device with access), persisted with `idb-keyval` under `em-permissions:${tsid}`. It is loaded during runtime initialization and skipped entirely in unit tests. CRUD lives in [`permissionsModel.ts`](../src/data-providers/permissionsModel.ts):

- **add** — generates a new access token, adds a `Share`, alerts the user.
- **delete** — removes the entry. If it's the *current* device and there are still others, dispatches `clear` (logs out). If it's the *last* device, calls `storage.clear()`, `db.clear()`, dispatches `clear`, and reloads.
- **update** — patches name/role.

## Cleanup

`db.clear` is the runtime's `drop`. It detaches the data provider (rejecting any writes still waiting on initialization), stops WebSocket sync, unsubscribes the materialization listener, and calls `client.drop()`, which closes SQLite and — for OPFS storage — deletes the thoughtspace's database file. Used by the device-removal flow above, and by e2e tests through `em.testHelpers.dropThoughtspace`.

Unit tests and most e2e runs initialize with `storage: 'memory'`, so they never touch OPFS; persistence-specific Puppeteer suites opt into OPFS explicitly. See [testing.md](testing.md).
