# Data Storage / Persistence

This prototype runs two TreeCRDT instances for one thoughtspace:

1. **Memory engine** — synchronous Rust/WASM TreeCRDT, containing the complete document.
2. **Persistent engine** — the full document in asynchronous SQLite, running through `@treecrdt/wa-sqlite` in an OPFS-backed worker.

The memory engine owns the document and accepts local commands synchronously. Redux owns UI state and a read-only document projection. Document commands execute in one memory transaction outside Redux's reducer, reading canonical state between composed steps. Redux publishes the completed snapshot once. Network sync is disabled, including when `VITE_TREECRDT_SYNC_BASE_URL` is set.

[`data-providers/thoughtspace.ts`](../src/data-providers/thoughtspace.ts) exposes one implementation through two interfaces: `db: DataProvider` supplies synchronous `project` reads and `transact`; `thoughtspaceRuntime: ThoughtspaceRuntime` manages initialization, readiness, cleanup, and waiting for persistence. [`createMemoryThoughtspace.ts`](../src/data-providers/treecrdt/createMemoryThoughtspace.ts) implements both. Its explicit [`ThoughtspaceTransaction`](../src/@types/ThoughtspaceTransaction.ts) provides synchronous `update`/`project`, operation receipts and `revert`, and an `afterPersist` callback.

## Running the prototype

The experimental `@treecrdt/wasm` dependency is a prebuilt GitHub prerelease pinned in `package.json` and `yarn.lock`. Its source is on TreeCRDT's `prototype/synchronous-wasm-view` branch; no local TreeCRDT build is required.

The package includes browser and Node loaders and the WASM binary. It initializes explicitly; importing it does not load WASM. Keep the core version aligned with EM's SQLite package so both replicas use the same operation format.

## Document projection (Redux)

`state.thoughts` is a [`ThoughtspaceView`](../src/@types/ThoughtspaceView.ts) captured against one immutable memory snapshot. It exposes `getThought`, `getChildren`, `getPosition`, `values`, and the derived `lexemeIndex`. Initialization loads the full document before enabling editing or resolving the URL cursor. Navigation, contexts, copying, and export read this view without loading or evicting subtrees.

There is no maintained EM `thoughtIndex`, child map, or rank field. Decoded payloads are cached; topology stays in the native snapshot. `project` preserves only sparse transient generation text, generation flags, and split-source bookkeeping from the editor view.

## Local persistence (TreeCRDT + SQLite)

### The TreeCRDT client

The prototype owns one persistent `TreecrdtClient` and one synchronous `MemoryClient`, both for `docId = tsid`. `createMemorySyncBackend` from `@treecrdt/wasm/sync` connects the memory client to the existing sync protocol without duplicating its operation log in EM.

| `ThoughtspaceStorage` | SQLite storage | Runtime |
|---|---|---|
| `'persistent'` (app default) | OPFS `/treecrdt-em-memory-prototype-${tsid}.db`; unavailable OPFS rejects initialization | `dedicated-worker` |
| `'memory'` (unit tests, most e2e) | in-memory | `direct` |

The separate filename leaves the normal app database untouched. [`index.tsx`](../src/index.tsx) passes `testFlags.thoughtspaceStorage ?? 'persistent'`. Initialization reports the actual mode through [`storageStatusStore`](../src/stores/storageStatusStore.ts) and Storage Diagnostics. The wa-sqlite assets come from the `treecrdt` Vite plugin; the memory client's WASM asset comes from its package.

### Single-tab access

[`sessionLock.ts`](../src/data-providers/treecrdt/sessionLock.ts) holds the exclusive Web Lock `em-treecrdt-session:${tsid}` for the lifetime of the page. Native platforms report `acquired`; browsers without Web Locks report `unsupported`. [`index.tsx`](../src/index.tsx) checks access before initializing, and renders [`ThoughtspaceInUse`](../src/components/ThoughtspaceInUse.tsx) when blocked.

### Document model

There is one CRDT document per thoughtspace, represented by two replicas, not one document per parent thought. Each thought is a node keyed by `ThoughtId`; the CRDT owns parent/child structure and sibling order.

`GLOBAL_ROOT_TOKEN` is the tree root, aliased by `ROOT_PARENT_ID`. [`initializeMemoryStorage.ts`](../src/data-providers/treecrdt/initializeMemoryStorage.ts) seeds the persistent tree with `SYSTEM_ROOT_THOUGHT_IDS` (`HOME_TOKEN`, `EM_TOKEN`, `ABSOLUTE_TOKEN`) and Settings before the memory peer synchronizes the complete document.

Node payloads contain only `value`, `created`, `lastUpdated`, `updatedBy`, and optional `archived` ([`payload.ts`](../src/data-providers/treecrdt/payload.ts)). `parentId` comes from the native row; child order and sibling positions are view reads, not payload fields.

### Derived view

There are no EM-owned SQLite membership or attribute-child tables. EM derives lexemes from thought values, excluding system roots. Child readers use canonical sibling order; attribute selectors resolve children by value.

A projection uses immutable snapshots and affected-node batches from transaction reads or commit events, with a full refresh for initialization or replay resets. Changed payloads update affected lexeme buckets. Child lists and sibling-position lookups are cached lazily, with no rank rewriting on moves. Payload-less nodes occupy canonical positions without becoming EM thoughts. Document reads use memory, not SQLite. UI-only actions reuse the view when neither the tree nor editor overlays changed.

### Writes

`db.transact` authors operations synchronously in Rust for one complete dispatched command. A `null` thought deletes; a new thought inserts; an existing thought moves or changes payload as needed. Each `transaction.update` returns the canonical view and derived lexemes. Payload comparisons avoid redundant operations. Parents are restored before descendants, and moves out of a deleted subtree precede its deletion. If a command throws, the adapter restores its tree, projection and operation bookkeeping; no partial command is queued for persistence or published.

A serialized `persistent.ops.appendMany(ops)` stores those exact operations without minting new identities. Its promise provides the persistence acknowledgement; the protocol's transport-send promise alone would not. The returned view already reads canonical memory payloads, parents, and child order. Persistence acknowledgements do not replace it with a captured SQLite readback.

An asynchronous append or loopback failure is reported through `onError` and gates subsequent document commits. The app displays an error asking the user to keep the tab open. Already accepted memory edits are not rolled back on persistence failure, and there is no durable retry queue.

#### Order and placement

`ThoughtspaceTransaction.update` accepts `movePlacements: Index<ThoughtId | null>`: the value names the preceding sibling, or `null` for first. Creates and parent changes require one; imports, moves, sorting and edits supply placements directly. Undo/redo instead asks TreeCRDT to revert operation IDs; EM does not reconstruct placements from Redux patches.

The transaction applies parents and placement anchors before their dependents, then deletions. Invalid anchors fail the atomic command rather than falling back to a numeric rank. `getPosition` reads a sibling's ordinal without storing it on `Thought`. See [data-model.md → rank](data-model.md#rank).

### Persistence and incoming changes

Promise tails serialize durable appends and loopback notifications. `persistent.onMaterialized` notifies the storage peer's full-document subscription. The memory adapter deduplicates operations by their replica/counter identity, applies new operations in a batch, and publishes a new immutable projection only when state changes. Storage confirmations do not overwrite newer memory edits.

Initialization and incoming snapshots use the non-undoable `replaceThoughts` action to publish the captured document view and repair cursor topology. Ordinary commands continue through the synchronous commit boundary.

### Runtime lifecycle

- `init` opens both engines, seeds canonical system nodes, and waits for full initial synchronization. Repeated calls share initialization.
- `index.tsx` displays startup UI until initialization succeeds. Failure closes resources without deleting the database and does not expose an editable app.
- `waitForIdle` drains accepted writes and local loopback work, including work they schedule. It is not proof that an external peer is caught up.
- `drop` rejects new edits, settles accepted work, then closes resources and deletes this thoughtspace's prototype database. Concurrent initialization waits for teardown.

## Remote sync and limits

Both peers run locally through `createInMemoryConnectedPeers` and the existing protobuf codec, using the standard full-document filter. No remote endpoint is opened; the retained WebSocket adapter is not started by the active factory. Authentication, network integration, and durable retries are not implemented by this prototype.

The full document and its operation history must fit in memory, and startup waits for hydration. Native forward updates read affected rows; historical replay requests a full snapshot. EM still copies the lexeme index when projecting changes. Diagnostic history comparisons temporarily materialize the full document in the existing report format; removing the live structural copy does not remove that O(N) work. Native rollback reconstructs retained history only on failure. This design deliberately has no partial-loading or migration mode.

## Command coordination and Redux publication

[`undoRedoEnhancer.ts`](../src/redux-enhancers/undoRedoEnhancer.ts) evaluates document commands and history restoration inside `db.transact`, then dispatches the original action with its prepared immutable state to a pure publication reducer. UI-only actions remain pure. [`command`](../src/util/command.ts) and [`reducerFlow`](../src/util/reducerFlow.ts) forward the explicit transaction through nested commands; no transaction is stored in Redux or a global current-command variable.

`updateThoughts` changes the memory document and reads its resulting view immediately. Updates with `persist: false` can change transient editor overlays, but cannot author document operations or evict canonical thoughts. There is no Redux write queue or separate lexeme derivation. The `onPersisted` callback runs only after SQLite acknowledges the whole command. Undo/redo uses the same document transaction; see [commands.md → Undo history](commands.md#undo-history-and-the-undo-slider).

```
command → memory transaction (update → canonical read → next step)
          ├→ completed snapshot → undo history + one Redux publication
          └→ asynchronous SQLite append of the same operations
             → loopback notification → persistence callback
```

## Reading and exporting

Selectors read the captured document view synchronously. Export scopes JSON to the selected subtree and generates legacy `rank` and `childrenMap` fields only during serialization; it does not wait for persistence. A `clear()` UI reset does not delete the TreeCRDT document; `clear({ persist: true })` explicitly deletes it.

## Identity & sharing

[`thoughtspaceSession.ts`](../src/data-providers/thoughtspaceSession.ts) bootstraps:

- `accessToken`: per-device nanoid in localStorage, also used for the permissions entry; optionally selected by `?auth=`.
- `tsid`: thoughtspace nanoid scoping the document, prototype OPFS file, Web Lock and permissions; optionally selected by `?share=`. Selecting a thoughtspace does not enable network sharing.
- `clientId`: base64 SHA-256 of the access token, still supplying `updatedBy`.

The memory engine uses a fresh random 32-byte replica id on every opening. A fresh identity avoids reusing a writer with an uncertain durable counter. This is not authenticated device enrollment or a key-recovery flow.

Device permissions live in [`permissionsStore.ts`](../src/data-providers/permissionsStore.ts): a [ministore](glossary.md#m) holding `Index<Share>` keyed by access token (one entry per device with access), persisted with `idb-keyval` under `em-permissions:${tsid}`. It is loaded during runtime initialization and skipped entirely in unit tests. CRUD lives in [`permissionsModel.ts`](../src/data-providers/permissionsModel.ts):

- **add** — generates a new access token, adds a `Share`, alerts the user.
- **delete** — removes the entry. If it's the *current* device and there are still others, dispatches `clear` (logs out). If it's the *last* device, calls `storage.clear()`, `thoughtspaceRuntime.drop()`, dispatches `clear`, and reloads.
- **update** — patches name/role.

## Cleanup

`thoughtspaceRuntime.drop()` drains work, stops the full-document subscription, detaches loopback peers and the materialization listener, frees WASM, and drops the prototype SQLite database. It is used by device removal and test teardown. Unit tests and most e2e runs use in-memory SQLite; persistence-specific Puppeteer suites explicitly use OPFS. See [testing.md](testing.md).
