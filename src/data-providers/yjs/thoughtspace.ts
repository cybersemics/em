import Emitter from 'emitter20'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Thought from '../../@types/Thought'
import ThoughtDb from '../../@types/ThoughtDb'
import ThoughtId from '../../@types/ThoughtId'
import Timestamp from '../../@types/Timestamp'
import updateThoughtsActionCreator from '../../action-creators/updateThoughts'
import { HOME_TOKEN, SCHEMA_LATEST } from '../../constants'
import { tsid, ydoc } from '../../data-providers/yjs/index'
import store from '../../stores/app'
import groupObjectBy from '../../util/groupObjectBy'
import hashThought from '../../util/hashThought'
import initialState from '../../util/initialState'
import keyValueBy from '../../util/keyValueBy'
import thoughtToDb from '../../util/thoughtToDb'
import { DataProvider } from '../DataProvider'

const yHelpers = ydoc.getMap<string>('helpers')

// map of all YJS thought Docs loaded into memory
// indexed by ThoughtId
// parallel to thoughtIndex and lexemeIndex
const thoughtDocs: Index<Y.Doc> = {}
const lexemeDocs: Index<Y.Doc> = {}

/** Returns a [promise, resolve] pair. The promise is resolved when resolve(value) is called. */
const promiseOnDemand = <T>(): [Promise<T>, (value: T) => void] => {
  const emitter = new Emitter()
  const promise = new Promise<T>((resolve, reject) => {
    emitter.on('resolve', resolve)
  })

  /** Triggers the emitter to resolve the promise. */
  const resolve = (value: T) => emitter.trigger('resolve', value)

  return [promise, resolve]
}

/** A promise that resolves to true when the root thought has been synced from IndexedDB. */
const [rootSyncedPromise, resolveRootSynced] = promiseOnDemand<ThoughtDb>()
export const rootSynced = rootSyncedPromise

/** Loads a thought from the persistence layers and binds the Y.Doc. Reuses the existing Y.Doc if it exists. The Y.Doc is immediately available in thoughtDocs. Thought is available on await. */
const loadThought = async (id?: ThoughtId): Promise<Thought | undefined> => {
  if (!id) return undefined

  const thoughtDoc = new Y.Doc({ guid: `thought-${id}` })

  // set up persistence and subscribe to changes
  if (!thoughtDocs[id]) {
    thoughtDocs[id] = thoughtDoc
    const thoughtMap = thoughtDoc.getMap()

    // eslint-disable-next-line no-new
    const persistence = new IndexeddbPersistence(`${tsid}-thought-${id}`, thoughtDoc)

    if (id === HOME_TOKEN) {
      persistence.whenSynced.then(() => resolveRootSynced(thoughtDocs[HOME_TOKEN]?.getMap().toJSON() as ThoughtDb))
    }

    thoughtMap.observe(async e => {
      if (e.transaction.origin === thoughtDoc.clientID) return
      const thought = thoughtMap.toJSON() as ThoughtDb
      Object.values(thought.childrenMap).forEach(childId => {
        loadThought(childId)
      })

      store.dispatch(
        updateThoughtsActionCreator({
          thoughtIndexUpdates: {
            [thought.id]: thought,
          },
          lexemeIndexUpdates: {},
          local: false,
          remote: false,
          repairCursor: true,
        }),
      )
    })

    await persistence.whenSynced
  }

  const thoughtMap = thoughtDoc.getMap()
  if (thoughtMap.size === 0) return undefined

  const thought = thoughtMap.toJSON() as Thought
  await loadLexeme(hashThought(thought.value))

  return thought
}

/** Loads a lexeme from the persistence layers and binds the Y.Doc. Reuses the existing Y.Doc if it exists. The Y.Doc is immediately available in lexemeDocs. Lexeme is available on await. */
const loadLexeme = async (key?: string): Promise<Lexeme | undefined> => {
  if (!key) return undefined

  const lexemeDoc = new Y.Doc({ guid: `lexeme-${key}` })

  // set up persistence and subscribe to changes
  if (!lexemeDocs[key]) {
    lexemeDocs[key] = lexemeDoc
    const lexemeMap = lexemeDoc.getMap()

    // eslint-disable-next-line no-new
    const persistence = new IndexeddbPersistence(`${tsid}-lexeme-${key}`, lexemeDoc)

    lexemeMap.observe(async e => {
      if (e.transaction.origin === lexemeDoc.clientID) return
      const lexeme = lexemeMap.toJSON() as Lexeme

      store.dispatch(
        updateThoughtsActionCreator({
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: {
            [key]: lexeme,
          },
          local: false,
          remote: false,
          repairCursor: true,
        }),
      )
    })

    await persistence.whenSynced
  }

  const lexeme = lexemeDoc.getMap().toJSON() as Lexeme
  return Object.keys(lexeme).length > 0 ? lexeme : undefined
}

/** Updates shared thoughts and lexemes. */
export const updateThoughts = async (
  thoughtIndexUpdates: Index<ThoughtDb | null>,
  lexemeIndexUpdates: Index<Lexeme | null>,
  schemaVersion: number,
) => {
  // group thought updates and deletes so that we can use the db bulk functions
  const { update: thoughtUpdates, delete: thoughtDeletes } = groupObjectBy(thoughtIndexUpdates, (id, thought) =>
    thought ? 'update' : 'delete',
  ) as {
    update?: Index<ThoughtDb>
    delete?: Index<null>
  }

  // group lexeme updates and deletes so that we can use the db bulk functions
  const { update: lexemeUpdates, delete: lexemeDeletes } = groupObjectBy(lexemeIndexUpdates, (id, lexeme) =>
    lexeme ? 'update' : 'delete',
  ) as {
    update?: Index<Lexeme>
    delete?: Index<null>
  }

  Object.keys(thoughtDeletes || {}).forEach(id => {
    thoughtDocs[id]?.destroy()
    // eslint-disable-next-line fp/no-delete
    delete thoughtDocs[id]
  })

  Object.keys(lexemeDeletes || {}).forEach(id => {
    lexemeDocs[id]?.destroy()
    // eslint-disable-next-line fp/no-delete
    delete lexemeDocs[id]
  })

  Object.entries(thoughtUpdates || {}).forEach(([id, thought]) => {
    loadThought(id as ThoughtId)
    const thoughtDoc = thoughtDocs[id]
    thoughtDoc.transact(() => {
      Object.entries(thought).forEach(([key, value]) => {
        thoughtDoc.getMap().set(key, value)
      })
    }, thoughtDoc.clientID)
  })

  Object.entries(lexemeUpdates || {}).forEach(([id, lexeme]) => {
    loadLexeme(id)
    const lexemeDoc = lexemeDocs[id]
    lexemeDoc.transact(() => {
      Object.entries(lexeme).forEach(([key, value]) => {
        lexemeDoc.getMap().set(key, value)
      })
    }, lexemeDoc.clientID)
  })
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  Object.entries(thoughtDocs).forEach(([id, doc]) => {
    doc.destroy()
    // eslint-disable-next-line fp/no-delete
    delete thoughtDocs[id]
  })
  Object.entries(lexemeDocs).forEach(([id, doc]) => {
    doc.destroy()
    // eslint-disable-next-line fp/no-delete
    delete lexemeDocs[id]
  })

  // reset to initialState, otherwise a missing ROOT error will occur when thought observe is triggered
  const state = initialState()
  const thoughtIndexUpdates = keyValueBy(state.thoughts.thoughtIndex, (id, thought) => ({
    [id]: thoughtToDb(thought),
  }))
  const lexemeIndexUpdates = state.thoughts.lexemeIndex

  updateThoughts(thoughtIndexUpdates, lexemeIndexUpdates, SCHEMA_LATEST)
}

/** Gets a single lexeme from the lexemeIndex by its id. */
export const getLexemeById = async (id: string) => loadLexeme(id)

/** Gets multiple thoughts from the lexemeIndex by Lexeme id. */
export const getLexemesByIds = async (ids: string[]) => Promise.all(ids.map(getLexemeById))

/** Get a thought by id. */
export const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  return loadThought(id)
}

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = async (ids: ThoughtId[]): Promise<(Thought | undefined)[]> =>
  Promise.all(ids.map(getThoughtById))

/** Persists the cursor. */
export const updateCursor = async (cursor: string | null) =>
  cursor ? yHelpers.set('cursor', cursor) : yHelpers.delete('cursor')

/** Deletes the cursor. */
export const deleteCursor = async () => yHelpers.delete('cursor')

/** Last updated. */
export const getLastUpdated = async () => yHelpers.get('lastUpdated')

/** Last updated. */
export const updateLastUpdated = async (lastUpdated: Timestamp) => yHelpers.set('lastUpdated', lastUpdated)

/** Deletes a single lexeme from the lexemeIndex by its id. Only used by deleteData. TODO: How to remove? */
export const deleteLexeme = async (id: string) => {
  lexemeDocs[id]?.destroy()
  // eslint-disable-next-line fp/no-delete
  delete lexemeDocs[id]
}

const db: DataProvider = {
  clear,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
