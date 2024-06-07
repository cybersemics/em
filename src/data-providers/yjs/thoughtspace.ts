import { clientId } from '.'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Path from '../../@types/Path'
import ReplicationCursor from '../../@types/ReplicationCursor'
import Storage from '../../@types/Storage'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import { UpdateThoughtsOptions } from '../../actions/updateThoughts'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../../constants'
import groupObjectBy from '../../util/groupObjectBy'
import hashThought from '../../util/hashThought'
import timestamp from '../../util/timestamp'
import { DataProvider } from '../DataProvider'
import { LexemeDocument } from '../rxdb/schemas/lexeme'
import { ThoughtDocument } from '../rxdb/schemas/thought'
import { rxDB } from '../rxdb/thoughtspace'

/**********************************************************************
 * Types
 **********************************************************************/

/** Creates a promise that is resolved with promise.resolve and rejected with promise.reject. */
interface ResolvablePromise<T, E = any> extends Promise<T> {
  resolve: (arg: T) => void
  reject: (err: E) => void
}

export interface ThoughtspaceOptions {
  accessToken: string
  /** Used to seed docKeys, otherwise replicateThought triggered from initializeCursor will fail. */
  cursor: Path | null
  isLexemeLoaded: (key: string, lexeme: Lexeme | undefined) => Promise<boolean>
  isThoughtLoaded: (thought: Thought | undefined) => Promise<boolean>
  onThoughtIDBSynced: (thought: Thought | undefined, options: { background: boolean }) => void
  onError: (message: string, objects: any[]) => void
  onProgress: (args: { replicationProgress?: number; savingProgress?: number }) => void
  onThoughtChange: (thought: Thought) => void
  onThoughtReplicated: (id: ThoughtId, thought: Thought | undefined) => void
  onUpdateThoughts: (args: UpdateThoughtsOptions) => void
  getItem: Storage<Index<ReplicationCursor>>['getItem']
  setItem: Storage<Index<ReplicationCursor>>['setItem']
  tsid: string
  tsidShared: string | null
  websocketUrl: string
}

type ThoughtspaceConfig = ThoughtspaceOptions

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Attaches a resolve function to a promise. */
const resolvable = <T, E = any>() => {
  let _resolve: (value: T) => void
  let _reject: (err: E) => void
  const promise = new Promise<T>((resolve, reject) => {
    _resolve = resolve
    _reject = reject
  })
  const p = promise as ResolvablePromise<T, E>
  p.resolve = _resolve!
  p.reject = _reject!
  return promise as ResolvablePromise<T, E>
}

/**********************************************************************
 * Module variables
 **********************************************************************/

/** The thoughtspace config that is resolved after init is called. Used to pass objects and callbacks into the thoughtspace from the UI. After they are initialized, they can be accessed synchronously on the module-level config variable. This avoids timing issues with concurrent replicateChildren calls that need conflict to check if the doc already exists. */
const config = resolvable<ThoughtspaceConfig>()

/** Cache the config for synchronous access. This is needed by replicateChildren to set thoughtDocs synchronously, otherwise it will not be idempotent. */
let configCache: ThoughtspaceConfig

/** Initialize the thoughtspace with event handlers and selectors to call back to the UI. */
export const init = async (options: ThoughtspaceOptions) => {
  const {
    isLexemeLoaded,
    isThoughtLoaded,
    getItem,
    setItem,
    onError,
    onProgress,
    onThoughtChange,
    onThoughtIDBSynced,
    onThoughtReplicated,
    onUpdateThoughts,
  } = options

  const accessToken = await options.accessToken
  const tsid = await options.tsid
  const tsidShared = await options.tsidShared
  const websocketUrl = await options.websocketUrl
  const cursor = await options.cursor

  console.info(
    'TODO_RXDB: thoughtspace.init - The thoughtspace has been initialized and has received the thoughtspace id (tsid), secret access token (accessToken) and various callbacks from the UI.',
    { accessToken, tsid },
  )

  configCache = {
    accessToken,
    cursor,
    isLexemeLoaded,
    isThoughtLoaded,
    onError,
    onProgress,
    onThoughtChange,
    onThoughtIDBSynced,
    onThoughtReplicated,
    onUpdateThoughts,
    getItem,
    setItem,
    tsid,
    tsidShared,
    websocketUrl,
  }

  config.resolve(configCache)
}

/**********************************************************************
 * Methods
 **********************************************************************/

/** Updates a yjs thought doc. Converts childrenMap to a nested Y.Map for proper children merging. Resolves when transaction is committed and IDB is synced (not when websocket is synced). */
// NOTE: Ids are added to the thought log in updateThoughts for efficiency. If updateThought is ever called outside of updateThoughts, we will need to push individual thought ids here.
export const updateThought = async (id: ThoughtId, thought: Thought): Promise<void> => {
  console.info(
    'TODO_RXDB: thoughtspace.updateThought - A thought has been updated in the Redux state and the change needs to be synced to the persistence layer and other clients.',
    { id, thought },
  )

  const { thoughts: thoughtCollection, lexemes: lexemeCollection } = rxDB

  const thoughtOld = await getThoughtById(id)
  const thoughtParentIdOld = thoughtOld?.parentId

  if (thoughtParentIdOld && thoughtParentIdOld !== thought.parentId) {
    // When a thought changes parents, we need to delete it from the old parent Doc and update the docKey.
    // Unfortunately, transactions on two different Documents are not atomic, so there is a possibility that one will fail and the other will succeed, resulting in an invalid tree.
    const lexemeKey = hashThought(thought.value)
    const lexemeDoc = await lexemeCollection.findOne(lexemeKey).exec()
    const lexeme = getLexeme(lexemeDoc)
    if (!lexemeDoc && id !== HOME_TOKEN && id !== EM_TOKEN) {
      // TODO: Why does throwing an error get suppressed?
      console.error(`updateThought: Missing Lexeme doc for thought ${id}`)
      return
    }
    // delete from old parent
    const parentThoughtDocOld = await thoughtCollection.findOne(thoughtParentIdOld).exec()

    if (parentThoughtDocOld) {
      const { [id]: prevThought, ...newChildrenMap } = parentThoughtDocOld.toJSON().childrenMap

      await parentThoughtDocOld?.incrementalPatch({
        childrenMap: newChildrenMap,
      })
    }

    // update Lexeme context docKey
    if (lexeme && !lexeme.contexts.includes(id)) {
      updateLexeme(lexemeKey, {
        ...lexeme,
        contexts: [...(lexeme.contexts || []), id],
      })
    }
  }

  // Insert or Update current thought
  await thoughtCollection.incrementalUpsert({
    id,
    childrenMap: thought.childrenMap,
    created: thought.created,
    lastUpdated: thought.lastUpdated,
    parentId: thought.parentId,
    rank: thought.rank,
    updatedBy: thought.updatedBy,
    value: thought.value,
    archived: thought.archived,
  })

  // Update parent thought
  const parentThoughtDoc = await thoughtCollection.findOne(thought.parentId).exec()

  if (parentThoughtDoc) {
    await parentThoughtDoc.incrementalPatch({
      childrenMap: {
        ...(parentThoughtDoc.toJSON().childrenMap! || {}),
        [id]: id,
      },
    })
  }
}

/** Updates a rxdb lexeme doc. Converts contexts to a nested Y.Map for proper context merging. Resolves when transaction is committed and IDB is synced (not when websocket is synced). */
// NOTE: Keys are added to the lexeme log in updateLexemes for efficiency. If updateLexeme is ever called outside of updateLexemes, we will need to push individual keys here.
export const updateLexeme = async (key: string, lexemeNew: Lexeme): Promise<void> => {
  const { lexemes: lexemeCollection } = rxDB

  await lexemeCollection.incrementalUpsert({
    id: key,
    created: lexemeNew.created || timestamp(),
    lastUpdated: lexemeNew.lastUpdated || timestamp(),
    updatedBy: lexemeNew.updatedBy || clientId,
    contexts: lexemeNew.contexts || [],
  })
}

/**
 * Replicates a thought from the persistence layers to state, IDB, and the Websocket server. If already replicating or replicated, resolves as soon as data is available (depends on background/remote params). The Doc can be updated concurrently while replicating.
 *
 * Precondition: docKey of id must be cached.
 *
 * Warning: It is not recommended to run replicateThought in background mode. The Doc is not cached in background mode, so calling replicateThought on multiple siblings will result in multiple replications of the parent.
 */
export const replicateThought = async (
  id: ThoughtId,
  {
    onDoc,
  }: {
    /** Callback with the doc as soon as it has been instantiated. */
    onDoc?: (doc: ThoughtDocument) => void
  } = {},
): Promise<Thought | undefined> => {
  /* 
    A thought has been created or made visible in the Redux state and needs to be synced from the persistence layer.
    It should stay in memory and we should be subscribed to realtime changes from other clients until freeThought is called.
    If background is true, this function should resolve as soon as the thought is loaded from the local db, but not wait until it is synced with the server.
    If background is false, this function should only resolve when the thought is fully synced with the server.
  */
  console.info('TODO_RXDB: thoughtspace.replicateThought', { id })
  const thoughtDoc = await getThoughtById(id)

  if (!thoughtDoc) {
    throw new Error(`replicateThought: Missing thoughtDoc for thought ${id}`)
  }

  const children = await replicateChildren(thoughtDoc.parentId, { onDoc })
  const child = children?.find(child => child.id === id)
  return child
}

/**
 * Replicates all thoughts contained within a Thought doc.
 *
 * @see replicateThought
 */
export const replicateChildren = async (
  id: ThoughtId,
  {
    onDoc,
  }: {
    onDoc?: (doc: ThoughtDocument) => void
  } = {},
): Promise<Thought[] | undefined> => {
  const { thoughts: thoughtCollection } = rxDB

  let thoughtDoc: ThoughtDocument | null = await thoughtCollection.findOne(id).exec()

  if (!thoughtDoc && [ROOT_PARENT_ID, EM_TOKEN, HOME_TOKEN].includes(id)) {
    thoughtDoc = await thoughtCollection.insert({
      id,
      childrenMap: {},
      created: timestamp(),
      lastUpdated: timestamp(),
      parentId: id === ROOT_PARENT_ID ? null : ROOT_PARENT_ID,
      rank: 0,
      updatedBy: clientId,
      value: id,
    })
  }

  if (!thoughtDoc) {
    return undefined
  }

  onDoc?.(thoughtDoc)

  const children = await getChildren(thoughtDoc)
  return children
}

/** Replicates a Lexeme from the persistence layers to state, IDB, and the Websocket server. Does nothing if the Lexeme is already replicated, or is being replicated. Otherwise creates a new, empty YDoc that can be updated concurrently while syncing. */
export const replicateLexeme = async (key: string): Promise<Lexeme | undefined> => {
  // special contexts do not have Lexemes
  // Redux state will store dummy Lexemes with empty contexts, but there is no reason to try to replicate them
  if (key === HOME_TOKEN || key === EM_TOKEN || key === ABSOLUTE_TOKEN) return undefined

  const { lexemes: lexemeCollection } = rxDB

  let lexemeDoc: LexemeDocument | null = await lexemeCollection.findOne(key).exec()

  if (!lexemeDoc) {
    lexemeDoc = await lexemeCollection.insert({
      id: key,
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: clientId,
      contexts: [],
    })
  }

  const lexeme = getLexeme(lexemeDoc)

  return lexeme
}

/** Gets all children from a thought RxDocument. Returns undefined if the doc does not exist. */
const getChildren = async (thoughtDoc: ThoughtDocument): Promise<Thought[] | undefined> => {
  if (!thoughtDoc) return undefined

  const { thoughts: thoughtCollection } = rxDB.collections
  const thought = thoughtDoc.toJSON()
  const childrenIds = Object.keys(thought.childrenMap || {})
  const thoughtsMap = await thoughtCollection.findByIds(childrenIds).exec()
  const thoughts = Array.from(thoughtsMap.values()).map(thought => thought.toJSON())
  return thoughts as Thought[]
}

/** Deletes a thought and clears the doc from IndexedDB. Resolves when local database is deleted. */
const deleteThought = async (id: ThoughtId): Promise<void> => {
  console.info(
    'TODO_RXDB: thoughtspace.deleteThought - The thought has been permanently deleted, which should be synced to the persistence layer and other clients.',
    { id },
  )
  const { thoughts: thoughtCollection } = rxDB.collections

  const thoughtDoc = await thoughtCollection.findOne(id).exec()

  if (thoughtDoc) {
    await thoughtDoc?.remove()
  }
}

/** Waits until the lexeme finishes replicating, then deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). */
export const freeLexeme = async (key: string): Promise<void> => {
  await tryDeallocateLexeme(key)
}

/** Deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). If the lexeme is retained, noop. Call freeLexeme to both safely unretain the lexeme and trigger deallocation when replication completes. */
const tryDeallocateLexeme = async (key: string): Promise<void> => {}

/** Deletes a Lexeme and clears the doc from IndexedDB. The server-side doc will eventually get deleted by the doclog replicationController. Resolves when the local database is deleted. */
const deleteLexeme = async (key: string): Promise<void> => {
  const { lexemes: lexemeCollection } = rxDB

  const lexemeDocOld = await lexemeCollection.findOne(key).exec()
  const lexemeOld = getLexeme(lexemeDocOld)

  if (lexemeDocOld && lexemeOld) {
    // When deleting a Lexeme, clear out the contexts first to ensure that if a new Lexeme with the same key gets created, it doesn't accidentally pull the old contexts.
    await updateLexeme(key, { ...lexemeOld, contexts: [] })

    await lexemeDocOld?.incrementalRemove()
  }
}

/** Updates shared thoughts and lexemes. Resolves when IDB is synced (not when websocket is synced). */
// Note: Does not await updates, but that could be added.
export const updateThoughts = async ({
  thoughtIndexUpdates,
  lexemeIndexUpdates,
  lexemeIndexUpdatesOld,
  schemaVersion,
}: {
  thoughtIndexUpdates: Index<Thought | null>
  lexemeIndexUpdates: Index<Lexeme | null>
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  schemaVersion: number
}) => {
  // group thought updates and deletes so that we can use the db bulk functions
  const { update: thoughtUpdates, delete: thoughtDeletes } = groupObjectBy(thoughtIndexUpdates, (id, thought) =>
    thought ? 'update' : 'delete',
  ) as {
    update?: Index<Thought>
    delete?: Index<null>
  }

  // group lexeme updates and deletes so that we can use the db bulk functions
  const { update: lexemeUpdates, delete: lexemeDeletes } = groupObjectBy(lexemeIndexUpdates, (id, lexeme) =>
    lexeme ? 'update' : 'delete',
  ) as {
    update?: Index<Lexeme>
    delete?: Index<null>
  }

  const updatePromise = [
    ...Object.entries(thoughtUpdates || {}).map(([id, thought]) => updateThought(id as ThoughtId, thought)),
    ...Object.entries(lexemeUpdates || {}).map(([key, lexeme]) => updateLexeme(key, lexeme)),
  ]

  const deletePromise = [
    ...(Object.keys(thoughtDeletes || {}) as ThoughtId[]).map(id => deleteThought(id)),
    ...Object.keys(lexemeDeletes || {}).map(key => deleteLexeme(key)),
  ]

  return Promise.all([...updatePromise, ...deletePromise])
}

/** Gets a Lexeme from a lexeme RxDocument. */
const getLexeme = (lexemeDoc: LexemeDocument | undefined | null): Lexeme | undefined => {
  if (!lexemeDoc) return
  // TODO - check type conversion to Lexeme
  const lexeme = lexemeDoc.toJSON() as unknown as Lexeme
  return lexeme
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  console.info('TODO_RXDB: thoughtspace.clear.')
  // TODO: reset to initialState, otherwise a missing ROOT error will occur when thought observe is triggered
  // const state = initialState()
  // const thoughtIndexUpdates = keyValueBy(state.thoughts.thoughtIndex, (id, thought) => ({
  //   [id]: thoughtToDb(thought),
  // }))
  // const lexemeIndexUpdates = state.thoughts.lexemeIndex
  // await updateThoughts({
  //   thoughtIndexUpdates,
  //   lexemeIndexUpdates,
  //   lexemeIndexUpdatesOld: {},
  //   schemaVersion: SCHEMA_LATEST,
  // })
}

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getLexemeById = (key: string) => replicateLexeme(key)

/** Gets multiple thoughts from the lexemeIndex by key. */
export const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => {
  // return Promise.all(keys.map(getLexemeById))

  const { lexemes: lexemeCollection } = rxDB.collections

  const foundLexemeDocs = await lexemeCollection.findByIds(keys).exec()

  return keys.map(key => {
    const foundLexemeDoc = foundLexemeDocs.get(key)
    if (!foundLexemeDoc) return undefined

    return getLexeme(foundLexemeDoc)
  })
}

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  // await replicateThought(id)

  const { thoughts: thoughtCollection } = rxDB.collections

  const thoughtDoc = (await thoughtCollection.findOne(id).exec()) as ThoughtDocument
  if (!thoughtDoc) return undefined

  return thoughtDoc.toJSON() as Thought
}

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = async (ids: ThoughtId[]): Promise<(Thought | undefined)[]> => {
  // return Promise.all(ids.map(getThoughtById))

  const { thoughts: thoughtCollection } = rxDB.collections

  const foundThoughtDocs = await thoughtCollection.findByIds(ids).exec()

  return ids.map(thoughtId => {
    const foundThoughtDoc = foundThoughtDocs.get(thoughtId)

    if (!foundThoughtDoc) return undefined

    return foundThoughtDoc.toJSON() as Thought
  })
}

/** Pauses replication for higher priority network activity, such as push or pull. */
export const pauseReplication = async () => {
  console.info(
    'TODO_RXDB: thoughtspace.pauseReplication - Background replication should be paused, e.g. to give priority to loading visible thoughts or syncing realtime edits.',
  )
  // const { replication } = await config
  // replication.pause()
}

/** Starts or resumes replication after being paused for higher priority network actvity such as push or pull. */
export const startReplication = async () => {
  console.info('TODO_RXDB: thoughtspace.startReplication - Background replication can be resumed.')
  // Disable replication controller as part of winding down YJS
  // const { replication } = await config
  // replication.start()
}

const db: DataProvider = {
  clear,
  freeLexeme,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
