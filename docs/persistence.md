# Data Storage / Persistence

The persistence layer has three tiers:

1. **In-memory state** — Redux store (`state.thoughts.thoughtIndex` and `state.thoughts.lexemeIndex`), holding only thoughts that are currently visible.
2. **Local persistence** — Yjs CRDT documents persisted with [y-indexeddb](https://github.com/yjs/y-indexeddb).
3. **Remote sync** — a [Hocuspocus](https://tiptap.dev/hocuspocus) server in [`server/`](../server). **Currently inert on `main`** — see [Remote sync](#remote-sync-currently-inert) below.

Two queues bridge Redux and the local Yjs store:

- **Push queue** ([`redux-enhancers/pushQueue.ts`](../src/redux-enhancers/pushQueue.ts)) drains `state.pushQueue` after every action and writes to Yjs.
- **Pull queue** ([`redux-middleware/pullQueue.ts`](../src/redux-middleware/pullQueue.ts)) tracks visible thoughts and pulls any pending ones from Yjs.

The single point of integration with Yjs is the [`DataProvider`](../src/data-providers/DataProvider.ts) interface, implemented as `db` in [`data-providers/yjs/thoughtspace.ts`](../src/data-providers/yjs/thoughtspace.ts).

## In-memory state (Redux)

Thoughts live in `state.thoughts.thoughtIndex` (keyed by `ThoughtId`) and `state.thoughts.lexemeIndex` (keyed by hashed value). Only thoughts that are *visible* — the cursor, its ancestors, `state.expanded` paths, and any context-view contexts and their ancestors — are held in memory. Everything else has either never been pulled or was freed after going off-screen.

Thoughts that are known to exist but haven't been loaded yet are flagged with `pending: true` so the UI can render placeholder rows while the pull queue fetches them.

## Local persistence (Yjs + y-indexeddb)

### Document model

- **Each parent's children are stored together in a single Y.Doc.** The doc is keyed by a `docKey`, which is normally the parent's `ThoughtId`. The root contexts (`HOME_TOKEN`, `ABSOLUTE_TOKEN`) and `EM_TOKEN` use a special `ROOT_PARENT_ID` docKey.
- **Each Lexeme has its own Y.Doc.** Keyed by `hashThought(value)`.
- The module-level `docKeys: Map<ThoughtId, string>` maps each thought to the docKey of the doc that contains it (i.e. the parent's docKey). This is the ledger that lets the system find a thought without walking the tree.

A thought Y.Doc has two top-level Y.Maps:
- `getMap('thought')` — single entry `docKey` storing the parent's docKey, used to walk ancestors during tangential-context loading.
- `getMap('children')` — keyed by `ThoughtId`, each value a `Y.Map<ThoughtYjs>` containing the thought's fields.

A Lexeme Y.Doc has a single top-level Y.Map containing the Lexeme's scalar fields plus per-context entries keyed `cx-${ThoughtId}` whose value is the docKey for that context (so the Lexeme can drive cross-context loading).

### Compact storage keys

To keep CRDT updates small, ThoughtDb and LexemeDb fields are stored under single-letter keys ([`thoughtspace.ts` lines ~127-151](../src/data-providers/yjs/thoughtspace.ts)):

| Thought key | Lexeme key | Field |
|---|---|---|
| `v` | — | `value` |
| `r` | — | `rank` |
| `m` | — | `childrenMap` (nested `Y.Map<ThoughtId>`) |
| `p` | — | `parentId` |
| `a` | — | `archived` (timestamp, optional) |
| `c` | `c` | `created` |
| `l` | `l` | `lastUpdated` |
| `u` | `u` | `updatedBy` |
| — | `x` | `contexts` (set of `cx-${id}` keys) |

`thoughtToDb` / `getThought` / `getLexeme` translate between these compact shapes and the in-memory `Thought` / `Lexeme` types.

### Document names

[`documentNameEncoder.ts`](../src/data-providers/yjs/documentNameEncoder.ts) builds Y.Doc guids of the form:

- Thought doc: `${tsid}/t/${docKey}`
- Lexeme doc: `${tsid}/l/${key}`
- Permissions doc: `${tsid}/permissions`

`tsid` is the thoughtspace ID — see [Identity & sharing](#identity--sharing).

### Module state in `thoughtspace.ts`

`thoughtspace.ts` keeps eight module-level Maps that together form the in-memory cache of Y.Docs and their lifecycle state:

- `thoughtDocs` — cached `Y.Doc` instances by docKey.
- `thoughtPersistence` — `IndexeddbPersistence` instances by docKey.
- `thoughtRetained` — Set of docKeys retained by foreground replication; deallocation is blocked while a docKey is in this set.
- `thoughtIDBSynced` — Promises that resolve when each doc has finished syncing with IDB.
- `thoughtWebsocketSynced` — websocket-sync promises (currently never populated; see [Remote sync](#remote-sync-currently-inert)).
- The four `lexeme*` maps are exact mirrors of the above for Lexemes.

A separate `docKeys: Map<ThoughtId, string>` is the ThoughtId → parent docKey ledger.

The thoughtspace exposes its callbacks to the rest of the app via a `resolvable<ThoughtspaceConfig>()` promise that is set up by `init()` and consumed by every async operation. `configCache` caches it for synchronous access from idempotent code paths.

### Replication

[`replicateThought`](../src/data-providers/yjs/thoughtspace.ts) and [`replicateLexeme`](../src/data-providers/yjs/thoughtspace.ts) hydrate a Y.Doc from local IDB and (when the websocket is wired) from the server. They are **idempotent under concurrency** because they synchronously insert the new Doc into the cache before awaiting any async work — concurrent calls for the same docKey return the same Doc.

- **Foreground replication** (default) adds the docKey to `thoughtRetained`, subscribes the children Y.Maps to `onThoughtChange`, and keeps the Doc cached until `freeThought` is called.
- **Background replication** does not retain the Doc; it deallocates after first sync. Used for the doclog replication controller and one-shot reads.

If IDB returns `AbortError` (the app was closed mid-sync), replication retries after `IDB_ERROR_RETRY = 1000` ms.

### Updates

- [`updateThought`](../src/data-providers/yjs/thoughtspace.ts) writes a single thought into its parent Y.Doc. If the thought has changed parents, it deletes the entry from the old parent Doc, updates the docKey in `docKeys` and in the Lexeme's `cx-${id}` map, and writes to the new parent. (These three writes span three Docs and are not atomic — there's a known risk of partial-failure inconsistency, called out in a code comment.) `childrenMap` is merged key-by-key as a nested `Y.Map<ThoughtId>`; other fields are written only if the value changed, to avoid emitting redundant CRDT updates.
- [`updateLexeme`](../src/data-providers/yjs/thoughtspace.ts) adds and removes contexts via `cx-${id}` keys.
- [`updateThoughts`](../src/data-providers/yjs/thoughtspace.ts) is the public `DataProvider` entry point. It groups updates and deletes, then submits both groups to a `TaskQueue` with **concurrency 16** ([`util/taskQueue.ts`](../src/util/taskQueue.ts)). Updates run before deletes within a single batch.

All update paths await `IndexeddbPersistence.whenSynced` (i.e. they resolve when the write hits IDB), but do not wait on the websocket.

### Memory management

Memory is reclaimed by the `freeQueue` half of the push queue (see below):

- `freeThought(docKey)` removes the docKey from `thoughtRetained`, awaits the IDB sync promise, then calls `tryDeallocateThought`.
- `tryDeallocateThought(docKey)` no-ops if the docKey is still retained (e.g. it was re-pulled before this call ran). Otherwise it destroys the Y.Doc (which destroys the IDB provider), clears all four caches, and removes children's docKey entries.
- `deleteThought(docKey)` is the destructive variant — it removes the entry from the parent Doc, calls `IndexeddbPersistence.clearData()` (or `clearDocument()` if the doc isn't loaded), and then runs `freeThought`.

Lexeme variants (`freeLexeme`, `tryDeallocateLexeme`, `deleteLexeme`) work the same way.

### Change observation

When another client (or the websocket, when wired) writes to a Y.Doc, the Y.Map observer fires. The handlers filter out self-originated events by checking `e.transaction.origin === doc.clientID`:

- [`onThoughtChange`](../src/data-providers/yjs/thoughtspace.ts) reads the changed thought, refreshes children docKey entries, and calls `config.onThoughtChange`. [`initialize.ts`](../src/initialize.ts) wires this to a 100ms-throttled `updateThoughts` dispatch (`local: false, remote: false`) that merges the change into Redux.
- [`onLexemeChange`](../src/data-providers/yjs/thoughtspace.ts) goes through `updateThoughtsThrottled` directly (also 100ms throttle).

## Remote sync (currently inert)

The [`server/`](../server) subpackage runs a [`@hocuspocus/server`](https://tiptap.dev/hocuspocus) instance behind Express on port 3001 (websocket route `/hocuspocus`), with optional Redis horizontal scaling via [`@hocuspocus/extension-redis`](https://tiptap.dev/hocuspocus) and Prometheus metrics on `/metrics` — see [`server/src/index.ts`](../server/src/index.ts) and [`server/src/metrics.ts`](../server/src/metrics.ts).

**However, the remote-sync path is decommissioned on `main`:**

- The server configures only the Redis extension. **No persistence extension is registered**, so documents would only live in process memory if the server were used. `y-mongodb-provider` is in [`server/package.json`](../server/package.json) and has a type stub at [`src/@types/y-mongodb-provider.d.ts`](../src/@types/y-mongodb-provider.d.ts), but it is not imported in `server/src/index.ts`.
- The client never constructs a `WebsocketProvider` or `HocuspocusProvider`. [`WebsocketProviderType.ts`](../src/@types/WebsocketProviderType.ts) has its `y-websocket-auth` import commented out and types the provider as `any`.
- The `thoughtWebsocketSynced` / `lexemeWebsocketSynced` maps in `thoughtspace.ts`, the `remote: true` flag on `replicateThought`, and the `remote: false` field on `updateThoughts` calls all still exist as scaffolding, but nothing populates the maps and nothing constructs a provider.

In effect, on `main` Yjs is used as a local-only document store. Local IndexedDB is the only persistence path.

## Push queue (Redux → Yjs)

[`redux-enhancers/pushQueue.ts`](../src/redux-enhancers/pushQueue.ts) is a Redux store enhancer that runs after every reducer. It drains `state.pushQueue` (a list of `PushBatch` objects pushed there by [`updateThoughts`](../src/actions/updateThoughts.ts) and friends) and partitions it into:

- **`dbQueue`** — batches with `local || remote` set. Applied sequentially via `db.updateThoughts({ thoughtIndexUpdates, lexemeIndexUpdates, lexemeIndexUpdatesOld, schemaVersion })`. After each batch resolves, any `idbSynced` callback on the batch is invoked.
- **`freeQueue`** — state-only batches whose `null` thought/lexeme entries indicate they should be released from the in-memory cache. Triggers `db.freeThought` / `db.freeLexeme`.

The enhancer also caches a small set of critical settings (`CACHED_SETTINGS` in [`constants.ts`](../src/constants.ts)) into `localStorage` so that things like the Tutorial setting are available during the first paint before Yjs hydrates. The corresponding read path is [`selectors/getSetting.ts`](../src/selectors/getSetting.ts).

Once Redux dispatches a thought update, the data flow is therefore:

```
reducer → state.pushQueue → pushQueue enhancer
       → db.updateThoughts (thoughtspace.ts)
       → updateQueue (TaskQueue, concurrency 16)
       → Y.Doc.transact + IndexeddbPersistence
       → idbSynced callback resolves
```

## Pull queue (Yjs → Redux)

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

Three tokens are bootstrapped in [`data-providers/yjs/index.ts`](../src/data-providers/yjs/index.ts):

- **`accessToken`** — a per-device 21-char nanoid stored in `localStorage`. Authenticates the device against the (currently inert) websocket server. Can be overridden by `?auth=<token>` in the URL.
- **`tsid`** — the thoughtspace ID; the Y.Doc id used by all per-thoughtspace docs. Also a 21-char nanoid in `localStorage`. Can be overridden by `?share=<tsid>` to switch the app onto a shared thoughtspace.
- **`clientId`** — a public key derived as `SHA-256(accessToken)`, base64-encoded. Available asynchronously via the exported `clientIdReady` promise. Stamped on every Thought and Lexeme write as `updatedBy`.

A separate Y.Doc, `permissionsClientDoc`, holds an `Index<Share>` keyed by access token (one entry per device with access). It is persisted locally via IDB at the doc name `${tsid}/permissions`. CRUD lives in [`permissionsModel.ts`](../src/data-providers/yjs/permissionsModel.ts):

- **add** — generates a new access token, adds a `Share` to `permissionsMap`, alerts the user.
- **delete** — removes the entry. If it's the *current* device and there are still others, dispatches `clear` (logs out). If it's the *last* device, calls `storage.clear()`, `db.clear()`, dispatches `clear`, and reloads.
- **update** — patches name/role.

[`useSharedType`](../src/hooks/useSharedType.ts) is a React hook for subscribing components to Y types in the permissions doc.

## Cleanup

[`db.clear`](../src/data-providers/yjs/thoughtspace.ts) iterates `thoughtDocs` and `lexemeDocs` and calls `deleteThought` / `deleteLexeme` on every entry, removing all local IDB data for the thoughtspace. Used by the device-removal flow above.

Tests skip IDB initialization entirely (`import.meta.env.MODE !== 'test'` guard at the bottom of [`yjs/index.ts`](../src/data-providers/yjs/index.ts)) to avoid `TransactionInactiveError` in `fake-indexeddb`.
