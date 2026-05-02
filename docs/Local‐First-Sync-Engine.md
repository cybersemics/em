**em** is designed to be *local-first*, allowing the user to work fully offline, without giving up collaborative editing and multi-device use when they are online. As it turns out, this is a harder problem than one might expect! After failed attempts with Firebase and YJS, it's time to take a step back and evaluate the available options based on lessons learned and a clarification of requirements. There have been fundamental advancements in CRDT and related technology since 2018, when the project started. A [new movement](https://localfirstweb.dev/) has been catalyzed to solve the challenges of local-first.

This document describes the requirements for local-first functionality in **em**, and contains notes on several existing local-first sync engines. The goal is to identify the sync engine that can best support the desired functionality, and craft a plan to implement it.

# Background

Read an introduction to the philosophy of [local-first software](https://www.inkandswitch.com/local-first/).

# Requirements

### 1. Replication

- Full replica on every device
    - Not just a cache.
- Partial replication
    - Share a subtree for collaborative editing.
- Replication progress
    - Provide user with % completed.

### 2. Consistency

- Maintain the same data across clients (eventual consistency).
- Update multiple docs atomically (transactions).
   - Or have a way to repair the tree if some updates fail.
- Conflict resolution: Unobtrusively handle conflicts if two nodes are edited concurrently.

### 3. Validity

- Maintain doubly linked parent-child connection.
- One parent per node.
- No cycles.
- Prevent subtrees becoming orphaned and inaccessible from the root node.
- Preserve ancestors (See: [Deleted parent](#deleted-parent) example below)
   <details>
      <summary>Details</summary>
    In the example, Client A and Client B are assumed to both be offline when they do the addition and delete, respectively. The child created by Client A should never be deleted indirectly as a consequence of Client B deleting one of its ancestors. Otherwise Client A could go to the trouble of adding an entire subtree only for it to get deleted accidentally by Client B.

    A consequence of this, I believe, is that a thought must be explicitly deleted, never deleted as a byproduct of its parent being deleted. If a user wants to delete a subtree of 10 thoughts, the system need to issue 10 deletes. Thoughts are explicitly deleted by the system, but the UI still offers the convenience of deleting all known descendants. When the user deletes a thought, we can lazily iterate the subtree and delete all descendants in the background.

    Note that a thought may be a leaf on one client, but a parent on a different client before they have synced up. So we can never know for sure if a thought is a leaf on all clients. There may always be descendants from other clients that just haven't synced yet.

    One idea I had was to automatically un-tombstone all ancestors whenever a thought is added or moved. That ensures it stays connected to the tree in the face of concurrent deletes. I haven't thought through how to get this to converge though.

    The downside of this approach is the re-appearance of a parent after its deletion. In order to be conservative with user data and avoid thoughts being deleted unintentionally by other clients, there will sometimes be cases where you have to re-delete a thought that you already deleted. This seems like a small price to pay for ensuring that your new thoughts are never deleted when you go back online.
    </details>

#### Examples

##### Merged children

- Client A: Adds child `a` to `x`.
- Client B: Adds child `b` into `x`.
- When synced, parent `x` needs to contain both `a` and `b`.

##### Divergent move

- Client A moves `x` into `a`.
    - `x.parentId = a`
    - `a.children = [x, ...]`
- Client B moves `x` into `b`.
    - `x.parentId = b`
    - `b.children = [x, ...]`
- Either operation is valid, *as long as the parentId and children remain consistent*.
- `x` should *not* end up in both `a` and `b`'s children.
- If `x` ends up in `a`, then `x.parentId = a`.
- If `x` ends up in `b`, then `x.parentId = b`.

##### Deleted parent

- Client A: Adds `y` as a child of `x`.
- Client B: Deletes `x`.
- When synced, `x` must be restored, otherwise `y` will be orphaned.

### 4. Efficiency

- getById
    - Efficiently access a document by id.
- getByProp
    - Efficiently access a document by an indexed property.
- delete
    - Efficiently delete a large subtree.
- import
    - Efficiently import 100k+ nodes.
- replicate
    - Efficiently replicate 100k+ nodes to a new device.
- longevity
    - Should not slow down after 1M+ operations

### 5. Reactive

- Subscribe to remote changes over websocket

### 6. Offline storage
- Web: IndexedDB
- Mobile: SQLite (capacitor app)

### 7. Auth
- Per document permissions

### 8. Full text search

# Sync Engines

Some handy lists of sync engines:

- https://electric-sql.com/docs/reference/alternatives
- https://rxdb.info/alternatives.html

## ✓ Yes/Maybe

These sync engines are active candidates for use in **em**. Some of them have not been researched at all.

- [CozoDB](https://www.cozodb.org/)
    - Graph db
    - Embeddable
- [Ditto](https://ditto.live/)
    - Control replication with queries.
    - No built-in synced event or progress percentage.
- [DXOS](https://dxos.org/)
- [Electric-next](https://next.electric-sql.com/)
- [Fireproof](https://fireproof.storage/)
- [Jazz](https://jazz.tools/)
- [Liveblocks](https://liveblocks.io/)
- [Loro](https://loro.dev/)
    - **Entire Doc loaded into memory**
      - Then how can there be lazy loading?
    - For applications requiring directory-like data manipulation, Loro utilizes the algorithm fro*m A Highly-Available Move Operation for Replicated Trees*, simplifying moving and reorganizing hierarchical data structures.
    - Alpha software
    - Similar to YJS
- [PowerSync](https://www.powersync.com/)
    - Partial replication
        - Sync buckets defined at compile-time
        - Client Parameters can be defined at run-time
    - E2E Encryption
        - *For end-to-end encryption, the encrypted data can be synced using PowerSync. The data can then either be encrypted and decrypted directly in memory by the application, or a separate local-only table can be used to persist the decrypted data — allowing querying the data directly.*
- [RxDB](https://rxdb.info/)
    - No transactions
    - Conflict resolution through revisions
    - SQLite plugin
- [SyncProxy](https://www.syncproxy.com/)
- [SQLSync](https://sqlsync.dev/)
- [Tinybase](https://tinybase.org/)
- [Triplit](https://www.triplit.dev/)
- [WatermelonDB](https://watermelondb.dev/)

## ✗ No

These sync engines have been considered and ruled out for reasons described below.

- [BlockSuite](https://blocksuite.io)
    - **Built on YJS**
- [ElectricSQL](https://electric-sql.com/)
    - **Basically deprecated as they transition to electric-next**
    - Sync required before query
        - *Once the initial data has synced, queries can run against it.*
        - But shapes can be subscribed and unsubscribed on the fly.
    - Dynamic partial replication
        - *There is no support for where clauses to filter the initial target rows or select clauses to filter the include tree. As a result, current calls to db.tablename.sync({...}) will "over sync" additional data onto the device.*
            - https://electric-sql.com/docs/reference/roadmap#shapes
    - Capacity
        - *thousands of rows are definitely viable, and we have that working with our own internal development tests. Hundreds of thousands or millions may cause issues right now, but are something we do want to support.*
            - https://news.ycombinator.com/item?id=37584555
    - Size
        - ~1.1MB WASM Download
            - https://news.ycombinator.com/item?id=37584522
            - Faster than 1MB JS since no parsing
- [Evolu](https://www.evolu.dev/)
    - **Too alpha**
- [Gun.js](https://gun.eco/)
    - **No full replica**
        - *The local instance only replicates the parts of the graph that you’ve accessed, so when you’re offline you can only read things you’ve already read. But you can update & add things without limit.*
            - Jared Forsyth
            - https://jaredforsyth.com/posts/local-first-database-gun-js/
    - **Known syncing issues**
    - **Known codebase quality issues**
- [Instant](https://www.instantdb.com/)
    - **No full replica**
    - **More offline-cached than offline-first**
- [Levelgraph](https://github.com/levelgraph/levelgraph)
    - **No replication**
    - *Levelgraph itself does not support replication in any way, as that is not part of the scope of the library (triple storage and queries).*
    - https://github.com/levelgraph/levelgraph/issues/195#issuecomment-997205147
- [NextGraph](https://nextgraph.org/)
    - [NextGraph Framework](https://docs.nextgraph.org/en/framework/) for app developers it not yet released at this time.
- [Replicache](https://replicache.dev/)
    - **To be replaced by ZeroSync, which is cache-based**
    - Downloads everything
- [SurrealDB](https://surrealdb.com/)
    - **Not offline-first**
        - https://github.com/orgs/surrealdb/discussions/107
        - As of 2024
    - surrealdb.wasm
    - Replication bridge?
        - Need conflict resolution
- [Verdant](https://verdant.dev/)
    - **No partial replication**
    - **Too alpha**
    - **No encryption**
- [YJS](https://yjs.dev/)
    - **Entire DB loaded into memory**
- [ZeroSync](https://zerosync.dev/)
    - **No full replica (cache-based)**
