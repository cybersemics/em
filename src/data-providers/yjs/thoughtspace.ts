import { clientId } from '.'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import { UpdateThoughtsOptions } from '../../actions/updateThoughts'
import { EM_TOKEN, HOME_TOKEN } from '../../constants'
import groupObjectBy from '../../util/groupObjectBy'
import hashThought from '../../util/hashThought'
import timestamp from '../../util/timestamp'
import { DataProvider } from '../DataProvider'
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
  isLexemeLoaded: (key: string, lexeme: Lexeme | undefined) => Promise<boolean>
  isThoughtLoaded: (thought: Thought | undefined) => Promise<boolean>
  onThoughtIDBSynced: (thought: Thought | undefined, options: { background: boolean }) => void
  onError: (message: string, objects: any[]) => void
  onProgress: (args: { replicationProgress?: number; savingProgress?: number }) => void
  onThoughtChange: (thought: Thought) => void
  onThoughtReplicated: (id: ThoughtId, thought: Thought | undefined) => void
  onUpdateThoughts: (args: UpdateThoughtsOptions) => void
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
    onError,
    onProgress,
    onThoughtChange,
    onThoughtIDBSynced,
    onThoughtReplicated,
    onUpdateThoughts,
  } = options

  configCache = {
    isLexemeLoaded,
    isThoughtLoaded,
    onError,
    onProgress,
    onThoughtChange,
    onThoughtIDBSynced,
    onThoughtReplicated,
    onUpdateThoughts,
  }

  config.resolve(configCache)
}

/**********************************************************************
 * Methods
 **********************************************************************/

/** Updates a thought in the db. */
export const updateThought = async (id: ThoughtId, thought: Thought): Promise<void> => {
  const { thoughts: thoughtCollection } = rxDB
  const thoughtOld = await getThoughtById(id)
  const thoughtParentIdOld = thoughtOld?.parentId

  if (thoughtParentIdOld && thoughtParentIdOld !== thought.parentId) {
    // Unfortunately, transactions on two different Documents are not atomic, so there is a possibility that one will fail and the other will succeed, resulting in an invalid tree.
    const lexemeKey = hashThought(thought.value)
    const lexeme = await getLexemeById(lexemeKey)
    if (!lexeme && id !== HOME_TOKEN && id !== EM_TOKEN) {
      // TODO: Why does throwing an error get suppressed?
      console.error(`updateThought: Missing Lexeme doc for thought ${id}`)
      return
    }

    // When a thought changes parents, we need to delete it from the old parent childrenMap.
    const parentThoughtDocOld = await thoughtCollection.findOne(thoughtParentIdOld).exec()
    if (parentThoughtDocOld) {
      const { [id]: prevThought, ...newChildrenMap } = parentThoughtDocOld.toJSON().childrenMap

      await parentThoughtDocOld?.incrementalPatch({
        childrenMap: newChildrenMap,
      })
    }

    // update Lexeme context id
    if (lexeme && !lexeme.contexts.includes(id)) {
      await updateLexeme(lexemeKey, {
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

  // Update parent thought childrenMap
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

/** Updates a lexeme in the db. */
export const updateLexeme = async (id: string, lexemeNew: Lexeme): Promise<void> => {
  const { lexemes: lexemeCollection } = rxDB
  await lexemeCollection.incrementalUpsert({
    id,
    created: lexemeNew.created || timestamp(),
    lastUpdated: lexemeNew.lastUpdated || timestamp(),
    updatedBy: lexemeNew.updatedBy || clientId,
    contexts: lexemeNew.contexts || [],
  })
}

/**
 * @deprecated Use getThoughtById instead.
 *
 * Replicates a thought from the persistence layers to state, IDB, and the Websocket server. If already replicating or replicated, resolves as soon as data is available (depends on background/remote params). The Doc can be updated concurrently while replicating.
 *
 * Precondition: docKey of id must be cached.
 *
 * Warning: It is not recommended to run replicateThought in background mode. The Doc is not cached in background mode, so calling replicateThought on multiple siblings will result in multiple replications of the parent.
 */
export const replicateThought = async (id: ThoughtId): Promise<Thought | undefined> => {
  return getThoughtById(id)
}

/**
 * @deprecated Use getChildren instead.
 *
 * Replicates all thoughts contained within a Thought doc.
 *
 * @see replicateThought
 */
export const replicateChildren = async (id: ThoughtId): Promise<Thought[] | undefined> => {
  return getChildren(id)
}

/**
 * @deprecated Use getLexemeById instead.
 *
 * Replicates a Lexeme from the persistence layers to state, IDB, and the Websocket server. Does nothing if the Lexeme is already replicated, or is being replicated. Otherwise creates a new, empty YDoc that can be updated concurrently while syncing.
 */
export const replicateLexeme = async (key: string): Promise<Lexeme | undefined> => {
  return getLexemeById(key)
}

/** Gets all children from a thought id. Returns undefined if the thought does not exist in the db. */
const getChildren = async (id: ThoughtId): Promise<Thought[] | undefined> => {
  const { thoughts: thoughtCollection } = rxDB

  const thoughtDoc = await thoughtCollection.findOne(id).exec()
  if (!thoughtDoc) return undefined

  const thought = thoughtDoc.toJSON()
  const childrenIds = Object.keys(thought.childrenMap || {})
  const childrenMap = await thoughtCollection.findByIds(childrenIds).exec()
  const children = Array.from(childrenMap.values()).map(thought => thought.toJSON())

  return children as Thought[]
}

/** Deletes multiple thoughts from the db. */
const deleteThoughts = async (ids: ThoughtId[]): Promise<void> => {
  const { thoughts: thoughtCollection } = rxDB.collections
  await thoughtCollection.bulkRemove(ids)
}

/** Waits until the thought finishes replicating, then deallocates the cached thought and associated providers (without permanently deleting the persisted data). */
// Note: freeThought and deleteThought are the only places where we use the id as the docKey directly.
// This is because we want to free all of the thought's children, not the thought's siblings, which are contained in the parent Doc accessed via docKeys.
export const freeThought = async (docKey: string): Promise<void> => {
  console.info(
    'TODO_RXDB: thoughtspace.freeThought - The thought is no longer visible and should be removed from memory. Realtime changes to this thought from other clients no longer need to be subscribed to.',
    { id: docKey },
  )

  // if the thought is retained again, it means it has been replicated in the foreground, and tryDeallocateThought will be a noop.
  await tryDeallocateThought(docKey)
}

/** Deallocates the cached thought and associated providers (without permanently deleting the persisted data). If the thought is retained, noop. Call freeThought to both safely unretain the thought and trigger deallocation when replication completes. */
const tryDeallocateThought = async (docKey: string): Promise<void> => {}

/** Waits until the lexeme finishes replicating, then deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). */
export const freeLexeme = async (key: string): Promise<void> => {
  await tryDeallocateLexeme(key)
}

/** Deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). If the lexeme is retained, noop. Call freeLexeme to both safely unretain the lexeme and trigger deallocation when replication completes. */
const tryDeallocateLexeme = async (key: string): Promise<void> => {}

/** Deletes a Lexeme from the db. */
const deleteLexeme = async (id: string): Promise<void> => {
  const { lexemes: lexemeCollection } = rxDB
  const lexemeDocOld = await lexemeCollection.findOne(id).exec()
  const lexemeOld = lexemeDocOld?.toJSON() as unknown as Lexeme

  if (lexemeDocOld && lexemeOld) {
    // When deleting a Lexeme, clear out the contexts first to ensure that if a new Lexeme with the same id gets created, it doesn't accidentally pull the old contexts.
    await updateLexeme(id, { ...lexemeOld, contexts: [] })

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
    deleteThoughts(Object.keys(thoughtDeletes || {}) as ThoughtId[]),
    ...Object.keys(lexemeDeletes || {}).map(key => deleteLexeme(key)),
  ]

  return Promise.all([...updatePromise, ...deletePromise])
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  await rxDB.thoughts.find().remove()
  await rxDB.lexemes.find().remove()

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

/** Gets a lexeme from the db by id. */
export const getLexemeById = async (id: string): Promise<Lexeme | undefined> => {
  const lexemes = await getLexemesByIds([id])
  return lexemes[0]
}

/** Gets multiple lexemes from the db by id. */
export const getLexemesByIds = async (ids: string[]): Promise<(Lexeme | undefined)[]> => {
  if (!rxDB) return []

  const { lexemes: lexemeCollection } = rxDB
  const foundLexemeDocs = await lexemeCollection.findByIds(ids).exec()

  return ids.map(id => {
    const foundLexemeDoc = foundLexemeDocs.get(id)
    if (!foundLexemeDoc) return undefined
    return foundLexemeDoc.toJSON() as unknown as Lexeme
  })
}

/** Gets a thought from the db. */
export const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  const thoughts = await getThoughtsByIds([id])
  return thoughts[0]
}

/** Gets multiple thoughts from the db by ids. O(n). */
export const getThoughtsByIds = async (ids: ThoughtId[]): Promise<(Thought | undefined)[]> => {
  if (!rxDB) return []

  const { thoughts: thoughtCollection } = rxDB
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
  freeThought,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
