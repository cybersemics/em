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

### Optimistic edits and write confirmation

Redux holds the optimistic view and `pendingThoughtWrites`: outstanding field patches, optional sibling placements, and the latest write ID per thought. This is separate from `Thought.pending`, which means not yet loaded. The provider publishes committed thoughts, complete affected memberships, and matching write IDs in one synchronous Redux update, including no-op confirmations. [`recordThoughtWriteResult`](../src/actions/recordThoughtWriteResult.ts) clears those writes before remaining pending edits are projected. Failed current writes retain their edit and error until superseded or the store is cleared; this is in-memory tracking, not a durable retry queue or a new error indicator. Later edits do not automatically retry previously failed fields. A failed confirmation does not imply storage rolled back.

[`projectLexemes`](../src/util/projectLexemes.ts) derives optimistic memberships from thought changes for creation, rename, deletion, merging, and imports. Unloaded occurrences become visible when confirmation arrives; an optimistic count is not necessarily complete. Lexeme timestamps and writer are also provisional: removing a member retains the previous aggregate until the provider publishes values derived from the remaining stored members. Pending thoughts and their ancestors are protected from cache eviction. Undo/redo excludes write tracking from history and persists restored thoughts normally. Clearing Redux advances `thoughtspaceGeneration`, invalidating outstanding confirmations and local materializations. There is no second snapshot store; the write barrier and pull guards below remain necessary.

Materialization refreshes and ordinary pulls apply pending persisted fields over the incoming thoughts, preserving current UI-only flags. A pending rename therefore does not hide a remote move, and a pending move does not replace a remote rename. Parent membership is rebuilt from pending placements, including when a pull refreshes only an old parent. A placement that would create a cycle is not projected. This projection does not change TreeCRDT's conflict resolution for genuinely concurrent payload writes.

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
- `GLOBAL_ROOT_TOKEN` is the tree root, and `ROOT_PARENT_ID` is defined as an alias for it ([`constants.ts`](../src/constants.ts)). Parent IDs pass directly to TreeCRDT; `getThoughtById` reports `ROOT_PARENT_ID` when the tree has no parent for a node.
- `SYSTEM_ROOT_THOUGHT_IDS` (`HOME_TOKEN`, `EM_TOKEN`, `ABSOLUTE_TOKEN`) are inserted as children of the global root during initialization, along with `[EM, 'Settings']` at the fixed `SETTINGS_TOKEN` — see `initializeThoughtspaceStorage` in [`treecrdt/thoughtspace.ts`](../src/data-providers/treecrdt/thoughtspace.ts).

Each node carries a payload: a JSON-encoded `ThoughtPayload` ([`payload.ts`](../src/data-providers/treecrdt/payload.ts)) with `value`, `created`, `lastUpdated`, `updatedBy`, and an optional `archived` timestamp. Everything else about a `Thought` is derived on read (see below). In particular **`rank`, `parentId`, and `childrenMap` are not stored in the payload.**

### Derived tables

Two app-owned indexes live alongside the CRDT tables in the same SQLite database. Neither is part of the CRDT, so neither replicates; both are rebuilt or maintained locally.

- **`em_lexeme_memberships`** ([`lexemes.ts`](../src/data-providers/treecrdt/lexemes.ts)) — one row per live thought, keyed by thought ID and indexed by `hashThought(value)`. Reads assemble `Lexeme.contexts` from these rows; Redux's potentially incomplete context arrays never replace stored membership. System root nodes are excluded. Lexeme metadata is derived from live members: earliest creation and latest update/writer, with contexts ordered by creation then thought ID.
- **`em_attribute_children`** ([`attributeChildren.ts`](../src/data-providers/treecrdt/attributeChildren.ts)) — `child_id` → (`parent_id`, `value`) for `=attribute` children only, indexed by `parent_id`. This restores em's `childrenMap` contract, where meta-attributes are keyed by value rather than by id.

`em_derived_indexes_meta` records a shared index version and materialization frontier only after both indexes finish. A missing, outdated, or stale checkpoint rebuilds both from TreeCRDT without rewriting payloads or operations. The checkpoint is invalidated before rebuilding so an interrupted rebuild is retried. Older independent index markers are ignored. An indexing failure rejects later work rather than checkpointing over the failure; reopening repairs the indexes.

### Reading a thought

`createThoughtReader` assembles a `Thought` from the tree plus the attribute index:

- Non-live nodes return `undefined`, even though TreeCRDT retains their payloads after deletion.
- `value` / `created` / `lastUpdated` / `updatedBy` / `archived` come from the decoded payload.
- `parentId` is the tree parent, falling back to `ROOT_PARENT_ID` when the tree reports none.
- `rank` is the node's **index among its siblings** (`0` when it has no parent). It is a projection of the tree's order, computed per read, not a persisted field.
- `childrenMap` is built by `createIndexedChildrenMap`: attribute children are keyed by their value (via `childrenMapKey`, which disambiguates duplicates), all other children by their `ThoughtId`. Insertion order follows `client.tree.children`, so `Object.values(childrenMap)` is the authoritative sibling order.

Child-order reads are shared within one batch or committed refresh, never across writes.

`testFlags.replicationDelay` injects an artificial delay into `getThoughtsByIds`, used by e2e tests that need to observe slow local materialization after a refresh.

### Writes

`updateThoughtsForClient` applies one push-queue batch:

1. **Upserts.** Field patches are keyed by thought ID and merged with the stored payload and parent, without constructing child maps or display ranks; a partial edit cannot create a missing thought. New thoughts use `client.local.insert` with a resolved placement (see below). Existing thoughts use `client.local.move` for placement changes and `client.local.payload` for changed payload fields. Redundant payload writes are skipped.
2. **Deletions.** Each `null` entry becomes a `client.local.delete`. Surviving children move first: moving them after deleting their old parent can revive that defensively deleted ancestor.
3. **Derived indexes.** Materialization maintains memberships and attribute children for both local and incoming operations. `lexemeIndexUpdates` is only needed for read results and cache eviction, not local mutations or persistence: memberships come from the stored nodes, including unloaded occurrences.

The function returns the operations it minted and the affected old/new lexeme keys. The runtime forwards the operations to remote sync.

Payloads remain whole-record TreeCRDT values: merging an app patch with a stored read does not introduce per-field CRDT conflict resolution.

`DataProvider.updateThoughts` persists one batch and returns `{ operations, lexemeIndex }`, with complete old/new memberships and `null` for removed lexemes. The runtime can persist several push-queue batches in one storage job, sharing the final membership read between their results and Redux publication. Reads and writes that arrive before binding wait on a readiness promise; failed initialization or `drop` rejects those waiters so the next initialization starts clean.

#### Order and placement

TreeCRDT stores sibling order directly, so a reorder is a `move` with an explicit placement (`first`, `last`, or `after: <siblingId>`) rather than a new rank number.

`PushBatch.movePlacements: Index<ThoughtId | null>` carries that intent: the key is the moved thought, the value is the sibling to place it after (`null` means first). Actions can supply it explicitly. The push-queue enhancer fills missing placements for creations and parent/rank changes from the preceding optimistic state plus that batch. This captures insertion and computed-sort positions before storage normalizes ranks.

`getTreecrdtPlacement` resolves it:

- A move of an existing thought **requires** an explicit placement and throws without one.
- A new insert, or a placement naming a sibling that is no longer there, falls back to `getRankPlacement`, which derives a placement from the thought's numeric `rank`.

The rank fallback remains for direct provider inserts and placements whose anchor disappeared. Redux selectors still use numeric display ranks projected from TreeCRDT order. See [data-model.md → rank](data-model.md#rank).

### Write barrier

[`writeBarrier.ts`](../src/data-providers/treecrdt/writeBarrier.ts) serializes provider reads, local batches, incoming sync operations, and committed publication. Each job finishes derived indexes and Redux publication before the next starts. Internal client/index calls never re-enter the queue or await its idle barrier. This is local ordering, not an atomic database transaction or a CRDT requirement. Redux optimistic edits remain synchronous.

The sync client uses queued operations, op-reference reads, metadata reads, and SQL calls bound to its originating client. Runtime teardown closes admission and drains accepted work before releasing that client. Uncoordinated writes through a raw client are not supported while the provider owns it; the app's single-tab lock enforces exclusive ownership across tabs.

It also namespaces local write IDs by page load. Redux batches include their thoughtspace generation, allowing delayed materializations from before a store reset to be discarded without suppressing another tab's changes. Bootstrap and direct provider writes receive counter-based IDs.

### Change observation (materialization)

`client.onMaterialized` fires after operations are materialized into SQLite — for remote ops arriving over sync as well as for local writes. The listener buffers events; the owning storage job updates attribute children and lexeme memberships, then publishes once. There is no separate index-write queue. Memberships come from current node state; the previous hash is looked up by thought ID, so rename/delete also work when the old thought was never loaded into Redux. Both indexes advance even without a UI bridge or after a Redux reset.

[`applyMaterializedThoughtsToStore`](../src/data-providers/treecrdt/sync/applyMaterializedThoughtsToStore.ts) consumes the owning job's indexed events; it does not write derived tables. With a bridge, it:

1. Discards obsolete generations and loads affected thoughts and parent child maps through [`refreshThoughtsFromMaterializationChanges`](../src/data-providers/treecrdt/sync/materializationThoughtUpdates.ts). Only structural changes refresh sibling ranks; payload edits still refresh parent maps for attribute renames. Local and remote events follow the same path. Deletions are checked against current storage; the internal global root is not published to Redux.
2. Reads complete affected memberships and synchronously calls `onCommit` with committed thoughts and matching write confirmations. The storage queue prevents intervening writes, so no version-counter retry loop is needed. `getGeneration` detects a receiving-view reset during the read and discards its publication.

[`createThoughtspaceMaterializationBridge`](../src/data-providers/createThoughtspaceMaterializationBridge.ts) supplies the Redux adapter for app initialization and headless store tests. Its `onCommit` reads current Redux state, preserves UI flags, filters unchanged memberships, and dispatches the committed update; the provider can read only the reset generation, not Redux's thoughts or lexemes. Publication bypasses the payload-timestamp guard and overlays remaining field intent. Ordinary pulls retain their timestamp guard. If a provider read itself triggers recovery, its job finishes the derived indexes and rereads once before returning a coherent read model.

### Memory management

`freeThought` / `freeLexeme` are **no-ops** in the TreeCRDT provider. The whole thoughtspace is a single SQLite database, so there is no per-document cache to release — freeing memory only means dropping entries from the Redux indexes, which the `freeQueue` half of the push queue already does. [`redux-middleware/freeThoughts.ts`](../src/redux-middleware/freeThoughts.ts) dispatches `freeThoughts` once `thoughtIndex` exceeds `globals.freeThoughtsThreshold`.

Deleting a thought is not a separate provider call: it is a `null` entry in `thoughtIndexUpdates`, handled by the write path above.

### Runtime lifecycle

`ThoughtspaceRuntime` ([`thoughtspace.ts`](../src/data-providers/thoughtspace.ts), implemented in [`treecrdt/runtime.ts`](../src/data-providers/treecrdt/runtime.ts)) exposes `acquireAccess`, `init`, `drop`, `waitForIdle`, and `persistPushQueueBatches`.

- **`init`** awaits `clientIdReady`, loads the permissions store, creates the client, binds it to the data provider (which seeds storage and subscribes to materialization), and finally tries to start WebSocket sync. It resolves to `{ clientId, storage }`, where `storage` is the storage the client actually opened rather than the one requested. `init` and `drop` are serialized on a single lifecycle tail, and adjacent `init` calls are coalesced, so teardown can never interleave with startup.
- **`waitForIdle`** waits for active initialization, then drains the shared storage queue, including work enqueued while waiting, and reports failures; it rejects after `TREECRDT_IDLE_TIMEOUT = 30000` ms. Waiting for initialization includes edits accepted before storage opens. Puppeteer tests reach it through the [`waitForThoughtspaceIdle`](../src/e2e/puppeteer/helpers/waitForThoughtspaceIdle.ts) helper, which calls `em.testHelpers.waitForThoughtspaceRuntimeIdle`.

## Remote sync (opt-in)

Remote sync speaks the TreeCRDT sync protocol over a WebSocket ([`treecrdtWebSocketSync.ts`](../src/data-providers/treecrdt/sync/treecrdtWebSocketSync.ts)). It is **off unless `VITE_TREECRDT_SYNC_BASE_URL` is set**, and always skipped in test mode.

- The base URL may be a `ws://` / `wss://` endpoint or an `http(s)://` discovery URL ([`sync/config.ts`](../src/data-providers/treecrdt/sync/config.ts)).
- On start, `connectTreecrdtWebSocketSync` runs `syncOnce()` to catch up, then `startLive()` to subscribe.
- Outbound: `persistPushQueueBatches` forwards the `Operation[]` returned by each batch flagged `local` to `pushLocalOps`.
- Inbound ops are materialized by the client and reach Redux through the materialization path above.

Failures are non-fatal by design: a failed start logs a warning and em keeps running against local storage only; a failed `pushLocalOps` logs and moves on.

## Push queue (Redux → TreeCRDT)

[`redux-enhancers/pushQueue.ts`](../src/redux-enhancers/pushQueue.ts) runs after every reducer and drains `state.pushQueue`. Batches with `local || remote` set become `dbQueue`; state-only batches become `freeQueue` and notify the provider through `freeThought` / `freeLexeme` (no-ops in TreeCRDT). The enhancer converts database batches into changed persisted fields and sibling placements, excluding derived child lists and UI flags. `thoughtspaceRuntime.persistPushQueueBatches` applies them in one provider job and resolves after publication, then `idbSynced` callbacks run. Confirmations from before a store reset are discarded, but callbacks still settle.

The enhancer also caches a small set of critical settings (`CACHED_SETTINGS` in [`constants.ts`](../src/constants.ts)) into `localStorage` so that things like the Tutorial setting are available during the first paint before the thoughtspace hydrates. The corresponding read path is [`selectors/getSetting.ts`](../src/selectors/getSetting.ts).

When [debug logging](debug-log.md) is enabled, each flush emits a `push` entry (batch count, thought/lexeme/move counts, and a sample of the thoughts written) and then either `pushSynced` or `pushError`. A `push` with no matching `pushSynced` is a write that never completed.

Once Redux dispatches a thought update, the data flow is therefore:

```
reducer → state.pushQueue → pushQueue enhancer
      → thoughtspaceRuntime.persistPushQueueBatches
      → provider storage job
      → TreeCRDT local ops + derived table writes
      → committed thoughts + memberships + matching confirmations published beneath pending Redux edits
      → next storage job may start; local Operation[] forwarded to WebSocket sync if connected
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

`db.clear` is the runtime's `drop`. It detaches the data provider (rejecting any writes still waiting on initialization), stops WebSocket sync, and calls `closeBinding` to drain accepted work before unsubscribing the materialization listener. Then `client.drop()` closes SQLite and — for OPFS storage — deletes the thoughtspace's database file. Used by the device-removal flow above, and by e2e tests through `em.testHelpers.dropThoughtspace`.

Unit tests and most e2e runs initialize with `storage: 'memory'`, so they never touch OPFS; persistence-specific Puppeteer suites opt into OPFS explicitly. See [testing.md](testing.md).
