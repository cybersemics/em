import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import { UpdateThoughtsOptions } from '../../actions/updateThoughts'
import groupObjectBy from '../../util/groupObjectBy'
import { DataProvider } from '../DataProvider'

/**********************************************************************
 * Types
 **********************************************************************/

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

/** Creates a promise that is resolved with promise.resolve and rejected with promise.reject. */
interface ResolvablePromise<T, E = any> extends Promise<T> {
  resolve: (arg: T) => void
  reject: (err: E) => void
}

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

/** Gets the entire thoughtspace rom the db. Simple localStorage demo only; obviously you would not fetch the entire db like this in practice. */
const getThoughtspace = () => {
  const s = localStorage.thoughtspace
  return s
    ? (JSON.parse(s) as {
        lexemes: { [key: string]: Lexeme }
        thoughts: { [key: ThoughtId]: Thought }
      })
    : {
        thoughts: {},
        lexemes: {},
      }
}

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
  const thoughtspace = getThoughtspace()
  localStorage.thoughtspace = JSON.stringify({
    ...thoughtspace,
    thoughts: {
      ...thoughtspace.thoughts,
      [id]: thought,
    },
  })

  return Promise.resolve()
}

/** Updates a lexeme in the db. */
export const updateLexeme = async (id: string, lexeme: Lexeme): Promise<void> => {
  const thoughtspace = getThoughtspace()
  localStorage.thoughtspace = JSON.stringify({
    ...thoughtspace,
    lexemes: {
      ...thoughtspace.lexemes,
      [id]: lexeme,
    },
  })

  return Promise.resolve()
}

/** Gets all children from a thought id. Returns undefined if the thought does not exist in the db. */
export const getChildren = async (id: ThoughtId): Promise<Thought[] | undefined> => {
  const thoughtspace = getThoughtspace()
  const childrenIds = Object.values(thoughtspace.thoughts[id].childrenMap)
  return Promise.resolve(childrenIds.map(id => thoughtspace.thoughts[id]))
}

/** Updates thoughts and lexemes. */
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

  const thoughtspace = getThoughtspace()

  ;(Object.entries(thoughtUpdates || {}) as [ThoughtId, Thought][]).forEach(([id, thought]) => {
    thoughtspace.thoughts[id] = thought
  })
  ;(Object.keys(thoughtDeletes || {}) as ThoughtId[]).forEach(id => {
    delete thoughtspace.thoughts[id]
  })
  Object.keys(lexemeDeletes || {}).forEach(key => {
    delete thoughtspace.lexemes[key]
  })
  Object.entries(lexemeUpdates || {}).forEach(([key, lexeme]) => {
    thoughtspace.lexemes[key] = lexeme
  })

  localStorage.thoughtspace = JSON.stringify(thoughtspace)

  return Promise.resolve()
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  delete localStorage.thoughtspace
  return Promise.resolve()
}

/** Gets a lexeme from the db by id. */
export const getLexemeById = async (key: string): Promise<Lexeme | undefined> => {
  const thoughtspace = getThoughtspace()
  return Promise.resolve(thoughtspace.lexemes[key])
}

/** Gets multiple lexemes from the db by id. */
export const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => {
  const thoughtspace = getThoughtspace()
  return Promise.resolve(keys.map(key => thoughtspace.lexemes[key]))
}

/** Gets a thought from the db. */
export const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  const thoughtspace = getThoughtspace()
  return Promise.resolve(thoughtspace.thoughts[id])
}

/** Gets multiple thoughts from the db by ids. O(n). */
export const getThoughtsByIds = async (ids: ThoughtId[]): Promise<(Thought | undefined)[]> => {
  const thoughtspace = getThoughtspace()
  return Promise.resolve(ids.map(id => thoughtspace.thoughts[id]))
}

/** Deallocates the thought from memory. */
export const freeThought = async (id: ThoughtId): Promise<void> => {}

/** Deallocates the lexeme from memory. */
export const freeLexeme = async (key: string): Promise<void> => {}

/** Pauses replication for higher priority network activity, such as push or pull. */
export const pauseReplication = async () => {}

/** Starts or resumes replication after being paused for higher priority network actvity such as push or pull. */
export const startReplication = async () => {}

const db: DataProvider = {
  clear,
  freeThought,
  freeLexeme,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
