# Glossary

A flat reference of project-specific terms used in code and docs. For deeper context, follow the cross-links into the topic-specific docs.

## A

**ABSOLUTE_TOKEN** — Sentinel `ThoughtId` (`'__ABSOLUTE__'`) for the absolute root, the parallel root used for the absolute context view. See [`constants.ts`](../src/constants.ts).

**absolute context** — A second root context whose ordering reflects recency rather than the home tree. `state.absoluteContextTime` is the timestamp captured when the absolute context was last entered; it shifts visibility for newly added thoughts so they surface in the absolute view. See `childrenFilterPredicate` in [`getChildren.ts`](../src/selectors/getChildren.ts).

**accessToken** — Per-device 21-char nanoid stored in `localStorage`. Authenticates the device against the (currently inert) websocket server. Override with `?auth=<token>`. See [persistence.md → Identity & sharing](persistence.md#identity--sharing).

**action** — A Redux state-mutating function under [`/src/actions`](../src/actions). Reducers are preferred over thunks; thunks only when a side effect is needed. Compose with [`util/reducerFlow`](../src/util/reducerFlow.ts).

**archived** — Soft-deletion timestamp on `Thought`. Distinct from `=archive`, the meta-attribute parent under which archived thoughts are nested.

**attribute / meta-attribute** — A child thought whose value starts with `=` (e.g. `=pin`, `=style`, `=view`). Meta-attributes change app behaviour for their parent (or, with `=children`/`=grandchildren`, for descendants). Stored under their value in `childrenMap` for `O(1)` lookup. See [metaprogramming.md](metaprogramming.md).

**autocrop** — Vertical: hides the empty space above a deep cursor by translating the layout container upward and counter-scrolling to keep visible thoughts stable. Horizontal: see *indent*. See [layout-rendering.md → useAutocrop](layout-rendering.md#useautocrop-vertical-autocrop).

**autofocus** — Per-thought visibility classification (`show | dim | hide | hide-parent`) computed from depth relative to the cursor. The closer to the cursor, the more visible. See [`Autofocus.ts`](../src/@types/Autofocus.ts) and [`calculateAutofocus.ts`](../src/selectors/calculateAutofocus.ts).

## B

**backend (drag)** — react-dnd backend selected by `isTouch`: `TouchBackend` on touch, `HTML5Backend` on desktop. Both patched. See [drag-and-drop.md → Backend selection](drag-and-drop.md#backend-selection).

**background replication** — Loads a Y.Doc and deallocates after first sync; doesn't retain. Used by the doclog controller and one-shot reads. Contrast with *foreground replication*. See [persistence.md → Replication](persistence.md#replication).

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

**dbQueue / freeQueue** — Two halves of the push-queue split. `dbQueue` writes batches with `local || remote` set; `freeQueue` releases entries from the in-memory cache. See [persistence.md → Push queue](persistence.md#push-queue-redux--yjs).

**docKey** — Identifier for a Y.Doc. For a thought, it's the parent's `ThoughtId` (or `ROOT_PARENT_ID` for root contexts). For a Lexeme, `hashThought(value)`. The `docKeys: Map<ThoughtId, string>` in `thoughtspace.ts` is the ledger that maps each thought to the doc that contains it.

**doclog** — Yjs document used to track replication state across clients. Driven by a *background replication* controller.

**DragCanceled / DragHold / DragInProgress / Inactive** — Values of [`LongPressState`](../src/constants.ts), the state machine for the drag/long-press subsystem. See [drag-and-drop.md → State machine](drag-and-drop.md#state-machine-statelongpress).

**DropChild / DropEnd / DropCliff / DropUncle / DropGutter** — Drop-target components for, respectively: dropping into an empty/collapsed thought, the end of a list, intermediate cliff levels, before the next hidden uncle, and the right-edge quick-delete panel. See [drag-and-drop.md](drag-and-drop.md).

**DropThoughtZone** — `ThoughtDrop` (insert *before* the target) or `SubthoughtsDrop` (insert *as a child*). The semantic distinction every drop target reports.

## E

**EM_TOKEN** — Sentinel `ThoughtId` (`'__EM__'`) for the hidden system context where user settings (e.g. `[EM, 'Settings']`) are stored. See [`constants.ts`](../src/constants.ts).

**expanded** — `state.expanded: Index<boolean>`, keyed by `hashPath(path)`. A thought's children are walked by `linearizeTree` only if its path is in this map. See [`expandThoughts`](../src/selectors/expandThoughts.ts).

## F

**fetchDescendants** — Async iterable that does breadth-first traversal of thought IDs and yields `{ thoughtIndex, lexemeIndex }` chunks. The actual pull engine. See [persistence.md → fetchDescendants](persistence.md#fetchdescendants-the-actual-pull-engine).

**foreground replication** — Default replication mode. Adds the docKey to `thoughtRetained`, subscribes to change events, and keeps the Y.Doc cached until `freeThought` is called. Contrast with *background replication*.

**freeThought / freeLexeme** — Releases a Y.Doc from the in-memory cache (after IDB sync). Idempotent and safe under concurrent re-pull. Distinct from *deleteThought*, which also wipes IDB.

## G

**generating** — Flag on `Thought` set while content is being produced by AI. Distinct from `pending` (loading from storage).

**gesture** — Swipe pattern for command activation on touch. Defined per command via the `gesture` field on [`Command`](../src/@types/Command.ts). See [commands.md → Gesture activation](commands.md#gesture-activation).

## H

**HOME_TOKEN** — Sentinel `ThoughtId` (`'__ROOT__'`) for the home root. The path `[HOME_TOKEN]` represents the root thought itself; every regular `Path` starts with a child of HOME (or ABSOLUTE) and the root token is implied. See [data-model.md → Path](data-model.md#path).

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

**meta-attribute** — See *attribute*.

**ministore** — Lightweight non-Redux store for ephemeral UI state, in [`/src/stores`](../src/stores). Used when the value doesn't need to participate in undo/redo, persistence, or selectors (e.g. `editingValue`, `viewport`, `scrollTop`).

**multicursor** — Multiple selected thoughts. `state.multicursors: Index<Path>` keyed by `hashPath(path)`. Commands that support multicursor declare it via the `multicursor` field on `Command`. Drag picks up the full set into `draggingThoughts`. See [commands.md → Multicursor](commands.md#multicursor).

## N

**=note** — Meta-attribute that displays a smaller-text note under a thought.

## P

**Path** — `[ThoughtId, ...ThoughtId[]]` — non-empty sequence of thought ids from root to a thought. Root itself is implied (`[HOME_TOKEN]` is the special case). May contain cycles when traversing context views. See [data-model.md → Path](data-model.md#path).

**pending** — Flag on `Thought` indicating the id is known to exist (`thoughtIndex[id]` is set) but the real data hasn't been pulled from local/remote storage yet. UI renders placeholders; the pull queue fetches based on visible pending IDs.

**permissionsClientDoc** — Separate Y.Doc holding `Index<Share>` keyed by access token (one entry per device with access). CRUD in [`permissionsModel.ts`](../src/data-providers/yjs/permissionsModel.ts).

**=pin / =pinChildren** — Meta-attributes that keep a thought (or all children of a context) expanded. `=pin` is also pre-loaded eagerly during `fetchDescendants` to avoid a flash of expanded children before `=pin/false` resolves.

**pull queue** — [`pullQueue.ts`](../src/redux-middleware/pullQueue.ts) middleware that, on every action, computes the visible thought IDs and triggers `pull` for any pending ones. Debounced 10 ms, throttled 100 ms. See [persistence.md → Pull queue](persistence.md#pull-queue-yjs--redux).

**push queue** — [`pushQueue.ts`](../src/redux-enhancers/pushQueue.ts) Redux enhancer that drains `state.pushQueue` after every action, partitioning into `dbQueue` (writes) and `freeQueue` (cache release). See [persistence.md → Push queue](persistence.md#push-queue-redux--yjs).

## Q

**quick drop** — Right-edge invisible 2em-wide drop panel mounted only while a drag is in progress, used for quick-delete. Implemented by `DropGutter` / `QuickDropController`. See [drag-and-drop.md](drag-and-drop.md).

## R

**rank** — `number` on `Thought` that determines sort order among siblings. Unique per parent; absolute value irrelevant. Fractional and negative values let inserts avoid renumbering. Overridden visually by `=sort` if set. See [data-model.md → rank](data-model.md#rank).

**reducerFlow** — [`util/reducerFlow.ts`](../src/util/reducerFlow.ts) — composes a list of reducers into a single reducer. Standard pattern in `actions/`.

**replication** — Loading a Y.Doc into the in-memory cache (from local IDB and, when wired, from the websocket server). `replicateThought` / `replicateLexeme` are idempotent under concurrency. See [persistence.md → Replication](persistence.md#replication).

**ROOT_CONTEXTS** — `[HOME_TOKEN, ABSOLUTE_TOKEN]`. The two top-level contexts.

**ROOT_PARENT_ID** — Sentinel `ThoughtId` used as the docKey for root-context Y.Docs. Distinct from `HOME_TOKEN` / `ABSOLUTE_TOKEN`, which are the root *thoughts*; `ROOT_PARENT_ID` is the *parent* of those root thoughts in the persistence layer.

## S

**schema version** — `SCHEMA_LATEST` in [`constants.ts`](../src/constants.ts). Sent with every `db.updateThoughts` call so legacy data can be migrated.

**shortcut** — Legacy term for *command*. The folder was renamed `/src/shortcuts → /src/commands`; some doc references and helper names persist.

**SimplePath** — A `Path` branded as having no cycles (no context-view crossings). Required by code that needs a single contiguous context. Get one via `simplifyPath` or by structurally guaranteeing it and casting. See [data-model.md → SimplePath](data-model.md#simplepath).

**=sort** — Meta-attribute that overrides manual rank ordering. Options: `Alphabetical`, `Created`, `Updated`, `Note` (sort by `=note` value), each `Asc` or `Desc`.

**splitChain** — [`splitChain.ts`](../src/selectors/splitChain.ts) — splits a `Path` into `SimplePath[]` at every context-view boundary. Inverse: [`contextChainToPath`](../src/util/contextChainToPath.ts).

**=style** — Meta-attribute carrying CSS styles. Variants: `=children/=style` (apply to direct children), `=grandchildren/=style` (one level deeper).

## T

**tangential context** — A context that hasn't been pulled directly through the cursor's ancestor chain but is referenced via a Lexeme entry in another loaded thought. `replicateThought` walks the Lexeme's `cx-${id}` entries and pulls ancestors so tangential references resolve. See `thoughtspace.ts` lines around the comment "tangential contexts".

**Thought** — In-memory record under `state.thoughts.thoughtIndex`. Distinct from `ThoughtDb`, the persisted shape with single-letter keys (`v`, `r`, `m`, …). See [data-model.md → Thought](data-model.md#thought) and [persistence.md → Compact storage keys](persistence.md#compact-storage-keys).

**ThoughtDb** — On-disk shape of a thought: same fields as `Thought` but keyed by single letters to keep CRDT updates compact. `thoughtToDb` / `getThought` translate.

**ThoughtId** — Branded 21-char nanoid string identifying a thought. See [`@types/ThoughtId.ts`](../src/@types/ThoughtId.ts).

**thoughtspace** — A user's complete thought tree, identified by *tsid*. The unit of sharing: switching `?share=<tsid>` switches the app onto a different thoughtspace.

**thoughtRetained** — Set of docKeys retained by foreground replication. While a docKey is in this set, its Y.Doc is not deallocated.

**TreeThought / TreeThoughtPositioned** — The two parallel lists produced per render: visible thoughts in document order, and the same with `x`/`y`/`width`/`height`/`cliff` filled in. See [layout-rendering.md → Two lists](layout-rendering.md#two-lists-one-ordering).

**tsid** — Thoughtspace ID. 21-char nanoid in `localStorage`. Used as the Y.Doc id prefix for every per-thoughtspace doc (`${tsid}/t/${docKey}`, `${tsid}/l/${key}`, `${tsid}/permissions`). Override with `?share=<tsid>`.

## U

**updatedBy** — `clientId` of the writer. Stamped on every Thought and Lexeme write so observers can filter out self-originated change events.

**updateThoughts** — The action ([`actions/updateThoughts.ts`](../src/actions/updateThoughts.ts)) that mutates Redux and queues a push. The push queue persists those batches through the active data provider's `updateThoughts`.

## V

**=view** — Meta-attribute controlling render mode. Options: `List` (default), `Table`, `Prose`.

**VirtualThought** — Component that wraps each rendered thought, measures its height, and reports back via `onResize`. See [layout-rendering.md → VirtualThought](layout-rendering.md#virtualthought--when-does-it-re-measure).

## Y

**Y.Doc** — A Yjs document. In em, one per parent thought (containing all its children) and one per Lexeme. Persisted locally via `IndexeddbPersistence`. See [persistence.md → Document model](persistence.md#document-model).
