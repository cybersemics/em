# Data Storage / Persistence

This prototype runs two TreeCRDT instances for one thoughtspace:

1. **Memory engine** — synchronous Rust/WASM TreeCRDT, containing the complete document.
2. **Persistent engine** — the full document in asynchronous SQLite, running through `@treecrdt/wa-sqlite` in an OPFS-backed worker.

The memory engine owns the document and accepts local commands synchronously. Redux owns UI state; an external editor store combines UI state with current document reads. Document commands execute in one memory transaction outside Redux's reducer, reading canonical state between composed steps. The completed editor state is published synchronously. Network sync is disabled, including when `VITE_TREECRDT_SYNC_BASE_URL` is set.

[`data-providers/thoughtspace.ts`](../src/data-providers/thoughtspace.ts) exposes one implementation through two interfaces: `db: DataProvider` supplies synchronous `project` reads, `transact`, and `subscribe` invalidations after committed changes; `thoughtspaceRuntime: ThoughtspaceRuntime` manages initialization, readiness, cleanup, and waiting for persistence. [`createMemoryThoughtspace.ts`](../src/data-providers/treecrdt/createMemoryThoughtspace.ts) implements both. Its explicit [`ThoughtspaceTransaction`](../src/@types/ThoughtspaceTransaction.ts) provides synchronous `insert`, `payload`, `move`, `delete`, and `project`, an unordered import/restore `update` batch, cumulative invalidations through `getChanges`, operation receipts and `revert`, and an `afterPersist` callback.

## Running the prototype

The experimental TreeCRDT dependencies are prebuilt GitHub release assets pinned by source commit in `package.json` and `yarn.lock`; no local TreeCRDT build is required. The memory WASM and SQLite extension must use the same operation and version-vector formats.

Browser OPFS requires cross-origin isolation: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` response headers. The Vite development and preview servers and Vercel configuration supply these headers. In-memory storage does not require OPFS.

The WASM package includes browser and Node loaders and the binary. It initializes explicitly; importing it does not load WASM. Its `@treecrdt/wasm/memory` entry point exports the synchronous live-reading `MemoryClient`, created by `createMemoryClient`; there is no separate snapshot client.

## Document projection and React subscriptions

The editor's `state.thoughts` is a [`ThoughtspaceView`](../src/@types/ThoughtspaceView.ts) reading the current memory tree, not a field in the Redux store or a historical snapshot. It exposes `getThought`, `getChildren`, `getPosition`, `values`, and `getLexeme(value)`. Its `revision` invalidates selector caches; it does not enable historical reads. Retain returned values when earlier content is needed; retaining a reader does not preserve the tree. Initialization loads the full document before enabling editing or resolving the URL cursor. Navigation, contexts, copying, and export read this view without loading or evicting subtrees.

[`useEditorSelector`](../src/hooks/useEditorSelector.ts) uses `useSyncExternalStoreWithSelector` to cache selected values. Editor-state identity marks a publication, not a retained document version; selectors must return owned values rather than the live reader. Ordinary React Redux `useSelector` reads only UI fields. [`EditorProvider`](../src/components/EditorProvider.tsx) supplies both interfaces; both dispatch through the same middleware and command boundary. Unchanged selections retain identity through the selector's equality function. A document-only event does not require a Redux state update.

EM does not maintain a second editable tree or store rank fields. TreeCRDT's projection caches decoded thoughts and payload-bearing child lists; unchanged results survive unrelated edits. Raw positions and node enumeration use the memory client directly. `project()` reads only the document. Redux keeps temporary generation text, generation flags, pending formatting, and split-source bookkeeping in `state.thoughtUi`; `getThoughtById` combines them with canonical content for editor consumers.

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

TreeCRDT's projection caches decoded thoughts and payload-bearing child lists. EM owns value hashing and a private committed membership index, built once at initialization. During a transaction, `getLexeme(value)` merges that index with cumulative native changes without modifying it. After native success, EM updates affected memberships before editor callbacks; aborts leave the committed index unchanged. Same-key payload updates and moves reuse membership lists. Payload-less nodes occupy canonical positions without becoming EM thoughts. Document reads use memory, not SQLite; UI-only changes reuse the document view.

Formatting comparisons use `transaction.capturePrevious()`: a synchronous reader backed by changed rows, valid only until the transaction callback returns. Incoming subscribers receive an equivalent previous reader for diagnostic move logging, valid only within the publication callback and before a reentrant commit. Neither reader may cross an `await`. Cursor repair captures neighbors before local deletion and retains the resolved cursor path at publication for incoming changes. History retains UI patches, session-local operation spans and sparse `formattingBefore` values; document diagnostics are captured only when generating a report.

### Writes

`db.transact` authors operations synchronously in Rust for one complete dispatched command. Ordinary commands explicitly insert, change payload fields, move, or delete; each subsequent read sees those writes. Payload comparisons avoid redundant operations. Imports/restores use `transaction.update` to order parents and placement anchors before dependents, then deletions. If a command throws, the adapter restores its tree, decoded caches and operation bookkeeping; no partial command is queued for persistence or published.

A serialized `persistent.ops.appendMany(ops)` stores those exact operations without minting new identities. Its promise provides the persistence acknowledgement; the protocol's transport-send promise alone would not. The returned view already reads canonical memory payloads, parents, and child order. Persistence acknowledgements do not replace it with a captured SQLite readback.

An asynchronous append or loopback failure is reported through `onError` and gates subsequent document commits. The app displays an error asking the user to keep the tab open. Already accepted memory edits are not rolled back on persistence failure, and there is no durable retry queue.

#### Order and placement

`insert(thought, afterId)` and `move(id, { parentId, afterId })` name the preceding sibling, or `null` for first. The bulk `update` accepts equivalent `movePlacements`; creates and parent changes require one. Adding or removing a child also repositions its nonempty, non-emoji-only parent when its context is sorted by `Updated`. Undo/redo instead asks TreeCRDT to revert operation IDs; EM does not reconstruct placements from Redux patches.

The bulk update applies parents and placement anchors before their dependents, then deletions; explicit writes execute in caller order. Invalid anchors fail the atomic command rather than falling back to a numeric rank. `getPosition` reads a sibling's ordinal without storing it on `Thought`. See [data-model.md → rank](data-model.md#rank).

### Persistence and incoming changes

Promise tails serialize durable appends and loopback notifications. `persistent.onMaterialized` notifies the storage peer's full-document subscription, except when every change is tagged as this memory provider's own write. Foreign, mixed, or unidentified changes still synchronize. The memory adapter deduplicates operations by their replica/counter identity, applies new operations in a batch, and invalidates current reads only when state changes. Storage confirmations do not overwrite newer memory edits.

Initialization explicitly publishes the initial view. `db.subscribe` invalidates the view on subsequent local and incoming commits; subscribers read the latest `project()` rather than replaying event payloads. Changes outside a dispatched command use non-undoable `replaceThoughts` to repair cursor topology. Ordinary commands publish their completed document and UI state together rather than exposing the provider notification mid-command.

### Runtime lifecycle

- `init` opens both engines, seeds canonical system nodes, and waits for full initial synchronization. Repeated calls share initialization.
- `index.tsx` displays startup UI until initialization succeeds. Failure closes resources without deleting the database and does not expose an editable app.
- `waitForIdle` drains accepted writes and local loopback work, including work they schedule. It is not proof that an external peer is caught up.
- `drop` rejects new edits, settles accepted work, then closes resources and deletes this thoughtspace's prototype database. Concurrent initialization waits for teardown.

## Remote sync and limits

Both peers run locally through `createInMemoryConnectedPeers` and the existing protobuf codec, using the standard full-document filter. No remote endpoint is opened; the retained WebSocket adapter is not started by the active factory. Authentication, network integration, and durable retries are not implemented by this prototype.

The full document and its operation history must fit in memory, and startup waits for hydration. Forward updates track affected rows. Report generation uses `db.readHistory` with a temporary native replica and diagnostic captures, outside edit/undo history recording. Late lower-Lamport arrivals can force repeated prefix replay and full-row comparison within that read session. Native undo's replay for inversion and failure rollback are separate from this on-demand reporting work. This design deliberately has no partial-loading or migration mode.

## Command coordination and Redux publication

[`commandExecutionEnhancer.ts`](../src/redux-enhancers/commandExecutionEnhancer.ts) evaluates document commands inside `db.transact`, then publishes editor state before provider subscribers run. [`undoRedoEnhancer.ts`](../src/redux-enhancers/undoRedoEnhancer.ts) prepares history changes within that transaction; its grouping bookkeeping commits only at publication. Editor and Redux UI subscribers therefore read a completed command, without waiting for SQLite acknowledgement. The pure Redux publication reducer receives only `UiState`, excluding `thoughts`, and only when UI fields change. UI-only actions remain pure. [`command`](../src/util/command.ts) and [`reducerFlow`](../src/util/reducerFlow.ts) forward the explicit transaction through nested commands; no transaction is stored in Redux or a global current-command variable.

`updateThoughts` runs an optional synchronous `write(transaction)` callback, then projects the document and applies explicit `thoughtUiUpdates`. UI-only updates omit `write`; temporary fields never enter document operations. Document publication prunes editor entries for deleted thoughts, and UI reset clears them. There is no Redux write queue or Redux-owned membership index. The `onPersisted` callback runs only after SQLite acknowledges the whole command. Undo/redo restores editor fields through UI patches and document content through the same document transaction; see [commands.md → Undo history](commands.md#undo-history-and-the-undo-slider).

```
command → memory transaction (update → canonical read → next step)
          ├→ completed changes → undo history + coherent editor publication
          │                      └→ Redux publication only for changed UI state
          └→ asynchronous SQLite append of the same operations
             → persistence callback
```

## Reading and exporting

Selectors read the current document synchronously. Export scopes JSON to the selected subtree and generates legacy `rank` and `childrenMap` fields only during serialization; it does not wait for persistence. A `clear()` UI reset does not delete the TreeCRDT document; `clear({ persist: true })` explicitly deletes it.

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

Learning state uses `storageModel` under `learning` and is restored by `initialState`, like font size and jump history. The pin is device-specific; practice progress is local for now. Neither is replicated by TreeCRDT.
