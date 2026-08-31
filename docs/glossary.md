# Glossary

A flat reference of project-specific terms used in code and docs. For deeper context, follow the cross-links into the topic-specific docs.

## A

**ABSOLUTE_TOKEN** — Sentinel `ThoughtId` (`'__ABSOLUTE__'`) for the absolute root, the parallel root used for the absolute context view. See [`constants.ts`](../src/constants.ts).

**absolute context** — A second root context whose ordering reflects recency rather than the home tree. `state.absoluteContextTime` is the timestamp captured when the absolute context was last entered; it shifts visibility for newly added thoughts so they surface in the absolute view. See `childrenFilterPredicate` in [`getChildren.ts`](../src/selectors/getChildren.ts).

**accessToken** — Per-device 21-char nanoid stored in `localStorage`. The device's secret: *clientId* (and from it the *replicaId*) is derived from it, and it keys the device's entry in *permissionsStore*. Override with `?auth=<token>`. See [persistence.md → Identity & sharing](persistence.md#identity--sharing).

**action** — A Redux state-mutating function under [`/src/actions`](../src/actions). Reducers are preferred over thunks; thunks only when a side effect is needed. Compose with [`util/reducerFlow`](../src/util/reducerFlow.ts).

**archived** — Soft-deletion timestamp on `Thought`. Distinct from `=archive`, the meta-attribute parent under which archived thoughts are nested.

**attribute / meta-attribute** — A child thought whose value starts with `=` (e.g. `=pin`, `=style`, `=view`). Meta-attributes change app behaviour for their parent (or, with `=children`/`=grandchildren`, for descendants). Stored under their value in `childrenMap` for `O(1)` lookup. See [metaprogramming.md](metaprogramming.md).

**attribute-child index** — `em_attribute_children`, an app-owned SQLite table mapping each `=attribute` child to its parent and value. It restores the value-keying half of *childrenMap*, which TreeCRDT itself does not store. Rebuilt from the tree when its version changes, then maintained on every write. See [persistence.md → Derived tables](persistence.md#derived-tables).

**autocrop** — Vertical: hides the empty space above a deep cursor by translating the layout container upward and counter-scrolling to keep visible thoughts stable. Horizontal: see *indent*. See [layout-rendering.md → useAutocrop](layout-rendering.md#useautocrop-vertical-autocrop).

**autofocus** — Per-thought visibility classification (`show | dim | hide | hide-parent`) computed from depth relative to the cursor. The closer to the cursor, the more visible. `=focus/Zoom` overrides this by hiding everything outside the zoomed thought's subtree. See [`Autofocus.ts`](../src/@types/Autofocus.ts) and [`calculateAutofocus.ts`](../src/selectors/calculateAutofocus.ts).

## B

**backend (drag)** — react-dnd backend selected by `isTouch`: `TouchBackend` on touch, `HTML5Backend` on desktop. Both patched. See [drag-and-drop.md → Backend selection](drag-and-drop.md#backend-selection).

**belowCursor** — Flag set on every `TreeThought` after the cursor is encountered during the in-order walk. Used to exclude hidden thoughts below the cursor from `totalHeight` so the document doesn't have a giant trailing dead zone.

**Brand** — Nominal-typing trick: `Path & Brand<'SimplePath'>` requires an explicit cast to convert. Used to enforce invariants TypeScript can't track. See [`Brand.ts`](../src/@types/Brand.ts).

**buffer depth** — `BUFFER_DEPTH = 2` in `pull`. Beyond this depth, descendants returned by `fetchDescendants` are marked `pending: true` rather than being fully fetched. The hard BFS-queue cap is `MAX_THOUGHTS_QUEUED = 100`. See [persistence.md → fetchDescendants](persistence.md#fetchdescendants-the-actual-pull-engine).

## C

**caret** — The native browser selection (`window.getSelection()`), typically collapsed to a vertical bar. Distinct from *cursor*. Direct access is gated through [`device/selection.ts`](../src/device/selection.ts) (lint-enforced). See [cursor-and-caret.md](cursor-and-caret.md).

**childrenMap** — `Thought.childrenMap: Index<ThoughtId>`. Keyed by `ThoughtId` for regular children but **keyed by value** for meta-attributes (e.g. `'=pin'`). The dual keying gives meta-attribute lookups a constant-time fast path.

**cliff** — A drop in visible depth between consecutive thoughts. `cliff = next.depth - node.depth` when negative; `cliff = -3` means three levels shallower. Drives extra padding (`cliffPadding`) and the number of `DropEnd` zones rendered. See [`DropCliff.tsx`](../src/components/DropCliff.tsx) and [layout-rendering.md → usePositionedThoughts](layout-rendering.md#usepositionedthoughts-x-and-y).

**clientId** — Public key of the writer, derived as base64(SHA-256(accessToken)). Stamped on every Thought/Lexeme write as `updatedBy`. Available asynchronously via the `clientIdReady` promise. See [persistence.md → Identity & sharing](persistence.md#identity--sharing).

**command** — A user-triggered operation (keyboard shortcut, gesture, toolbar button, or Command Universe entry). Single-file definition under [`/src/commands`](../src/commands) implementing the [`Command`](../src/@types/Command.ts) interface; auto-registered via the barrel import in [`commands.ts`](../src/commands.ts). The legacy name *shortcut* still appears in some places. See [commands.md](commands.md).

**Command Universe** — Searchable list of all commands, opened with `Command/Ctrl + P` on desktop.

**Context** — `string[]` — a sequence of thought *values* from root to leaf, e.g. `['Animals', 'Cats']`. Ambiguous when duplicate values exist at the same level. Prefer `ThoughtId`/`Path` when an id is in scope. See [data-model.md → Context](data-model.md#context).

**context view** — A view mode that replaces a thought's children with the contexts in which the thought's value appears. Toggled with `Option + Shift + S`. The "inbound links" dual to the outbound parent-child links. State: `state.contextViews`, keyed by `hashPath(path)`. See [data-model.md → Context view](data-model.md#context-view).

**contextChain** — A `Path` that crosses one or more context views, split into its `SimplePath` segments. `Path → SimplePath[]` via [`splitChain`](../src/selectors/splitChain.ts). See [data-model.md → contextChain](data-model.md#contextchain).

**crossContextualKey** — `${contextChain.map(head).join('')}|${id}`. The React key for a thought that may appear at multiple positions when context views are active. Same `ThoughtId` produces different keys per occurrence. See [layout-rendering.md → Keys](layout-rendering.md#keys-crosscontextualkey).

**cursor** — The active thought, stored as `state.cursor: Path | null`. Indicated by the gray bullet ring. Distinct from *caret*. Setting the cursor does not set the browser selection; see [cursor-and-caret.md](cursor-and-caret.md).

## D

**DataProvider** — The single interface ([`DataProvider.ts`](../src/data-providers/DataProvider.ts)) for storage backends. The active implementation is exported through [`data-providers/thoughtspace.ts`](../src/data-providers/thoughtspace.ts).

**dbQueue / freeQueue** — Two halves of the push-queue split. `dbQueue` writes batches with `local || remote` set; `freeQueue` releases entries from the in-memory cache. See [persistence.md → Push queue](persistence.md#push-queue-redux--treecrdt).

**docId** — The TreeCRDT document identifier for the thoughtspace. Equal to *tsid*. See [persistence.md → The TreeCRDT client](persistence.md#the-treecrdt-client).

**DragCanceled / DragHold / DragInProgress / Inactive** — Values of [`LongPressState`](../src/constants.ts), the state machine for the drag/long-press subsystem. See [drag-and-drop.md → State machine](drag-and-drop.md#state-machine-statelongpress).

**DropChild / DropEnd / DropCliff / DropUncle / DropGutter** — Drop-target components for, respectively: dropping into an empty/collapsed thought, the end of a list, intermediate cliff levels, before the next hidden uncle, and the right-edge quick-delete panel. See [drag-and-drop.md](drag-and-drop.md).

**DropThoughtZone** — `ThoughtDrop` (insert *before* the target) or `SubthoughtsDrop` (insert *as a child*). The semantic distinction every drop target reports.

## E

**EM_TOKEN** — Sentinel `ThoughtId` (`'__EM__'`) for the hidden system context where user settings (e.g. `[EM, 'Settings']`) are stored. See [`constants.ts`](../src/constants.ts).

**expanded** — `state.expanded: Index<boolean>`, keyed by `hashPath(path)`. A thought's children are walked by `linearizeTree` only if its path is in this map. Expansion is derived from the cursor _and_ the multicursor: a selected thought expands its ancestors but stays collapsed itself, so any reducer that changes `state.multicursors` must recalculate `expanded`. See [`expandThoughts`](../src/selectors/expandThoughts.ts).

## F

**fetchDescendants** — Async iterable that does breadth-first traversal of thought IDs and yields `{ thoughtIndex, lexemeIndex }` chunks. The actual pull engine. See [persistence.md → fetchDescendants](persistence.md#fetchdescendants-the-actual-pull-engine).

**freeThought / freeLexeme** — `DataProvider` methods for releasing a thought or Lexeme from the provider's in-memory cache. No-ops under TreeCRDT, which keeps the whole thoughtspace in one SQLite database; freeing memory means dropping entries from the Redux indexes. See [persistence.md → Memory management](persistence.md#memory-management).

## G

**generating** — Flag on `Thought` set while content is being produced by AI. Distinct from `pending` (loading from storage).

**GLOBAL_ROOT_TOKEN** — The root node of the TreeCRDT tree, and the value `ROOT_PARENT_ID` aliases. `HOME_TOKEN`, `EM_TOKEN`, and `ABSOLUTE_TOKEN` are inserted as its children during initialization. See [`constants.ts`](../src/constants.ts).

**gesture** — Swipe pattern for command activation on touch. Defined per command via the `gesture` field on [`Command`](../src/@types/Command.ts). See [commands.md → Gesture activation](commands.md#gesture-activation).

## H

**HOME_TOKEN** — Sentinel `ThoughtId` for the home root. The path `[HOME_TOKEN]` represents the root thought itself; every regular `Path` starts with a child of HOME (or ABSOLUTE) and the root token is implied. See [data-model.md → Path](data-model.md#path).

## I

**indent (horizontal autocrop)** — As the cursor descends, the entire tree slides left so the cursor stays roughly center-screen. Multiplied by `0.9` per level so depth remains visually perceptible. See [layout-rendering.md → Indent](layout-rendering.md#indent-horizontal-autocrop).

**isTable / isTableCol1 / isTableCol2 / isTableCol2Child** — Flags set on `TreeThought` when the parent / grandparent / great-grandparent has `=view/Table`. Drive the column-placement math in `usePositionedThoughts`.

## J

**jump history** — `state.jumpHistory: (Path | null)[]` plus `state.jumpIndex`. Stack of past edit points navigable with the Jump Back / Jump Forward commands. New edits are prepended.

## L

**Lexeme** — Object collecting all the contexts where a value (or any of its near-identical word forms — case, plurality, emoji variants) appears. Stored in `state.thoughts.lexemeIndex` keyed by `hashThought(value)`. The "inbound links" view of a thought. See [data-model.md → Lexeme](data-model.md#lexeme).

**linearizeTree** — Selector that produces `treeThoughts: TreeThought[]` — an in-order traversal of every visible thought. Output drives layout. See [layout-rendering.md → linearizeTree](layout-rendering.md#linearizetree-the-in-order-traversal).

**LongPressState** — Enum (`Inactive | DragHold | DragInProgress | DragCanceled`) tracking the long-press / drag-in-progress state machine. Stored on `state.longPress`. See [drag-and-drop.md](drag-and-drop.md#state-machine-statelongpress).

## M

**materialization** — TreeCRDT applying operations to its SQLite read model, after which `client.onMaterialized` fires. em ignores events produced by its own writes (identified by *writeId*) and refreshes Redux from the rest. See [persistence.md → Change observation](persistence.md#change-observation-materialization).

**meta-attribute** — See *attribute*.

**ministore** — Lightweight non-Redux store for ephemeral UI state, in [`/src/stores`](../src/stores). Used when the value doesn't need to participate in undo/redo, persistence, or selectors (e.g. `editingValue`, `viewport`, `scrollTop`).

**movePlacements** — `Index<ThoughtId | null>` on `PushBatch`. Keyed by moved thought; the value is the sibling to place it after (`null` = first). Carries reorder intent from the action layer to TreeCRDT, which stores sibling order directly instead of by rank. See [persistence.md → Order and placement](persistence.md#order-and-placement).

**multicursor** — Multiple selected thoughts. `state.multicursors: Index<Path>` keyed by `hashPath(path)`. Commands that support multicursor declare it via the `multicursor` field on `Command`. Drag picks up the full set into `draggingThoughts`. See [commands.md → Multicursor](commands.md#multicursor).

## N

**=note** — Meta-attribute that displays a smaller-text note under a thought.

## P

**Path** — `[ThoughtId, ...ThoughtId[]]` — non-empty sequence of thought ids from root to a thought. Root itself is implied (`[HOME_TOKEN]` is the special case). May contain cycles when traversing context views. See [data-model.md → Path](data-model.md#path).

**pending** — Flag on `Thought` indicating the id is known to exist (`thoughtIndex[id]` is set) but the real data hasn't been pulled from local/remote storage yet. UI renders placeholders; the pull queue fetches based on visible pending IDs.

**permissionsStore** — Ministore holding `Index<Share>` keyed by access token (one entry per device with access), persisted with `idb-keyval` under `em-permissions:${tsid}`. See [`permissionsStore.ts`](../src/data-providers/permissionsStore.ts); CRUD in [`permissionsModel.ts`](../src/data-providers/permissionsModel.ts).

**=pin** — Meta-attribute that keeps a thought expanded. Scoped variants: `=children/=pin` keeps all children of a context expanded (the replacement for the old `=pinChildren`), and `=descendants/=pin` keeps the entire subtree expanded. `=pin` is also pre-loaded eagerly during `fetchDescendants` to avoid a flash of expanded children before `=pin/false` resolves. See [metaprogramming.md](metaprogramming.md#pinning--expansion).

**pull queue** — [`pullQueue.ts`](../src/redux-middleware/pullQueue.ts) middleware that, on every action, computes the visible thought IDs and triggers `pull` for any pending ones. Debounced 10 ms, throttled 100 ms. See [persistence.md → Pull queue](persistence.md#pull-queue-treecrdt--redux).

**push queue** — [`pushQueue.ts`](../src/redux-enhancers/pushQueue.ts) Redux enhancer that drains `state.pushQueue` after every action, partitioning into `dbQueue` (writes) and `freeQueue` (cache release). See [persistence.md → Push queue](persistence.md#push-queue-redux--treecrdt).

## Q

**quick drop** — Right-edge invisible 2em-wide drop panel mounted only while a drag is in progress, used for quick-delete. Implemented by `DropGutter` / `QuickDropController`. See [drag-and-drop.md](drag-and-drop.md).

## R

**rank** — `number` on `Thought` that determines sort order among siblings. Unique per parent; absolute value irrelevant. Fractional and negative values let inserts avoid renumbering. Rank is the only order the render path reads: a parent's `=sort` takes effect by renumbering its children's ranks, not by re-sorting at render time. See [data-model.md → rank](data-model.md#rank).

**reducerFlow** — [`util/reducerFlow.ts`](../src/util/reducerFlow.ts) — composes a list of reducers into a single reducer. Standard pattern in `actions/`.

**replicaId** — The 32-byte id TreeCRDT mints local operations under, derived from *clientId* by `clientIdToReplicaId`. A low-level CRDT identity, not an auth identity.

**replication** — Loading thoughts out of local storage and into memory. [`replicateTree`](../src/data-providers/data-helpers/replicateTree.ts) walks a subtree in the background without populating Redux; the pull queue is the foreground path. `syncStatusStore.replicationProgress` tracks it for the UI.

**ROOT_CONTEXTS** — `[HOME_TOKEN, ABSOLUTE_TOKEN]`. The two top-level contexts.

**ROOT_PARENT_ID** — Sentinel `ThoughtId` for the parent of the root thoughts. An alias for `GLOBAL_ROOT_TOKEN`, the TreeCRDT tree root. Distinct from `HOME_TOKEN` / `ABSOLUTE_TOKEN`, which are the root *thoughts*; `ROOT_PARENT_ID` is their *parent*. `getThoughtById` reports it as the `parentId` of any thought whose TreeCRDT parent is the tree root.

## S

**session lock** — Exclusive Web Lock named `em-treecrdt-session:${tsid}`, held for the lifetime of the page so only one tab opens a thoughtspace at a time. A second tab renders [`ThoughtspaceInUse`](../src/components/ThoughtspaceInUse.tsx) instead of the app. See [persistence.md → Single-tab access](persistence.md#single-tab-access).

**shortcut** — Legacy term for *command*. The folder was renamed `/src/shortcuts → /src/commands`; some doc references and helper names persist.

**SimplePath** — A `Path` branded as having no cycles (no context-view crossings). Required by code that needs a single contiguous context. Get one via `simplifyPath` or by structurally guaranteeing it and casting. See [data-model.md → SimplePath](data-model.md#simplepath).

**=sort** — Meta-attribute that sorts a context's children, replacing their manual order by renumbering their ranks. Options: `Alphabetical`, `Created`, `Updated`, `Note` (sort by `=note` value), each `Asc` or `Desc`.

**splitChain** — [`splitChain.ts`](../src/selectors/splitChain.ts) — splits a `Path` into `SimplePath[]` at every context-view boundary. Inverse: [`contextChainToPath`](../src/util/contextChainToPath.ts).

**=style** — Meta-attribute carrying CSS styles. Variants: `=children/=style` (apply to direct children), `=grandchildren/=style` (one level deeper).

## T

**tangential context** — A context that hasn't been pulled directly through the cursor's ancestor chain but is referenced from elsewhere — via a Lexeme's `contexts`, or by the context view. `fetchDescendants` enqueues the parent of any thought whose parent isn't loaded, so the ancestor chain resolves. See the comment "load ancestors of tangential contexts" in [`fetchDescendants.ts`](../src/data-providers/data-helpers/fetchDescendants.ts).

**Thought** — In-memory record under `state.thoughts.thoughtIndex`. Only part of it is persisted: TreeCRDT stores a *ThoughtPayload* per node and derives `parentId`, `rank`, and `childrenMap` from the tree on read. See [data-model.md → Thought](data-model.md#thought) and [persistence.md → Document model](persistence.md#document-model).

**ThoughtId** — Branded string identifying a thought: 32 lowercase hex characters (128 bits), the format TreeCRDT requires for a node id. Minted by [`createId`](../src/util/createId.ts). See [`@types/ThoughtId.ts`](../src/@types/ThoughtId.ts).

**ThoughtPayload** — The bytes stored on a TreeCRDT node: JSON-encoded `value`, `created`, `lastUpdated`, `updatedBy`, and optional `archived`. See [`payload.ts`](../src/data-providers/treecrdt/payload.ts).

**thoughtspace** — A user's complete thought tree, identified by *tsid*. The unit of sharing: switching `?share=<tsid>` switches the app onto a different thoughtspace.

**ThoughtspaceRuntime** — Lifecycle interface around the active provider ([`thoughtspace.ts`](../src/data-providers/thoughtspace.ts)): `acquireAccess`, `init`, `drop`, `waitForIdle`, `persistPushQueueBatches`. Implemented for TreeCRDT in [`runtime.ts`](../src/data-providers/treecrdt/runtime.ts).

**TreeCRDT** — The CRDT that backs local persistence: one operation-based tree per thoughtspace, materialized into SQLite (wa-sqlite, OPFS-backed) and optionally synced over a WebSocket. See [persistence.md](persistence.md).

**TreeThought / TreeThoughtPositioned** — The two parallel lists produced per render: visible thoughts in document order, and the same with `x`/`y`/`width`/`height`/`cliff` filled in. See [layout-rendering.md → Two lists](layout-rendering.md#two-lists-one-ordering).

**tsid** — Thoughtspace ID. 21-char nanoid in `localStorage`. Scopes everything per-thoughtspace: the TreeCRDT `docId`, the OPFS database file (`/treecrdt-em-${tsid}.db`), the session lock, and the permissions key. Override with `?share=<tsid>`.

## U

**undo step** — What one Undo reverts: a single patch on `state.undoPatches`, or two when a navigation action follows an undoable action or an edit follows a `newThought`. The undo slider moves by undo steps. See [commands.md → Undo history and the undo slider](commands.md#undo-history-and-the-undo-slider).

**updatedBy** — `clientId` of the writer. Stamped on every Thought and Lexeme write. (Self-originated materialization events are filtered by *writeId*, not by this field.)

**updateThoughts** — The action ([`actions/updateThoughts.ts`](../src/actions/updateThoughts.ts)) that mutates Redux and queues a push. The push queue persists those batches through the active data provider's `updateThoughts`.

## V

**=view** — Meta-attribute controlling render mode. Options: `List` (default), `Table`, `Prose`.

**VirtualThought** — Component that wraps each rendered thought, measures its height, and reports back via `onResize`. See [layout-rendering.md → VirtualThought](layout-rendering.md#virtualthought--when-does-it-re-measure).

## W

**write barrier** — [`writeBarrier.ts`](../src/data-providers/treecrdt/writeBarrier.ts). Serializes em → TreeCRDT persistence and exposes an idle barrier, so a materialization refresh cannot reapply stale rows over newer optimistic state. Also mints each write's *writeId*.

**writeId** — `em-local:${sourceId}:${n}`, attached to every local TreeCRDT write and echoed on the materialization changes it produces. Lets this tab recognize and skip its own already-applied writes.
