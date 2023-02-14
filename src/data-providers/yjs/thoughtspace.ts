import Emitter from 'emitter20'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket-auth'
import * as Y from 'yjs'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Thought from '../../@types/Thought'
import ThoughtDb from '../../@types/ThoughtDb'
import ThoughtId from '../../@types/ThoughtId'
import Timestamp from '../../@types/Timestamp'
import updateThoughtsActionCreator from '../../action-creators/updateThoughts'
import { HOME_TOKEN, SCHEMA_LATEST } from '../../constants'
import { accessToken, tsid, websocketUrl, ydoc } from '../../data-providers/yjs/index'
import store from '../../stores/app'
import groupObjectBy from '../../util/groupObjectBy'
import hashThought from '../../util/hashThought'
import initialState from '../../util/initialState'
import keyValueBy from '../../util/keyValueBy'
import thoughtToDb from '../../util/thoughtToDb'
import { DataProvider } from '../DataProvider'

const yHelpers = ydoc.getMap<string | number>('helpers')

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

/** Updates a yjs thought doc. Converts childrenMap to a nested Y.Map for proper children merging. */
const updateThoughtDoc = (thoughtDoc: Y.Doc, thought: Thought): Promise<void> => {
  thoughtDoc.transact(() => {
    const thoughtMap = thoughtDoc.getMap()
    Object.entries(thoughtToDb(thought)).forEach(([key, value]) => {
      // merge childrenMap Y.Map
      if (key === 'childrenMap') {
        let childrenMap = thoughtMap.get('childrenMap') as Y.Map<ThoughtId>

        // create new Y.Map for new thought
        if (!childrenMap) {
          childrenMap = new Y.Map()
          thoughtMap.set('childrenMap', childrenMap)
        }

        // delete children from the yjs thought that are no longer in the state thought
        childrenMap.forEach((childKey: string, childId: string) => {
          if (!value[childId]) {
            childrenMap.delete(childId)
          }
        })

        // add children that are not in the yjs thought
        Object.entries(thought.childrenMap).forEach(([key, childId]) => {
          if (!childrenMap.has(key)) {
            childrenMap.set(key, childId)
          }
        })
      }
      // other keys
      else {
        thoughtMap.set(key, value)
      }
    })
  }, thoughtDoc.clientID)

  return new Promise<void>(resolve => thoughtDoc.once('afterTransaction', resolve))
}

/** Updates a yjs lexeme doc. Converts contexts to a nested Y.Map for proper context merging. */
const updateLexemeDoc = (lexemeDoc: Y.Doc, lexeme: Lexeme): Promise<void> => {
  lexemeDoc.transact(() => {
    const lexemeMap = lexemeDoc.getMap()
    Object.entries(lexeme).forEach(([key, value]) => {
      // merge contexts Y.Map
      if (key === 'contexts') {
        const contextsObject = keyValueBy(value as ThoughtId[], cxid => ({ [cxid]: true }))
        // keyed by context ThoughtId
        let contextsMap = lexemeMap.get('contexts') as Y.Map<true>

        // create new Y.Map for new lexeme
        if (!contextsMap) {
          contextsMap = new Y.Map()
          lexemeMap.set('contexts', contextsMap)
        }

        // delete contexts from the yjs lexeme that are no longer in the state lexeme
        contextsMap.forEach((value: true, cxid: string) => {
          if (!contextsObject[cxid]) {
            contextsMap.delete(cxid)
          }
        })

        // add children that are not in the yjs lexeme
        lexeme.contexts.forEach(cxid => {
          if (!contextsMap.has(cxid)) {
            contextsMap.set(cxid, true)
          }
        })
      }
      // other keys
      else {
        lexemeMap.set(key, value)
      }
    })
  }, lexemeDoc.clientID)

  return new Promise<void>(resolve => lexemeDoc.once('afterTransaction', resolve))
}

/** Loads a thought from the persistence layers and returns a Y.Doc. Reuses the existing Y.Doc if it exists. */
const loadThoughtDoc = (id: ThoughtId): Y.Doc => {
  // use the existing Doc if possible, otherwise the map will not be immediately populated
  const thoughtDoc = thoughtDocs[id] || new Y.Doc({ guid: `thought-${id}` })
  const thoughtMap = thoughtDoc.getMap()

  // set up persistence and subscribe to changes
  if (!thoughtDocs[id]) {
    thoughtDocs[id] = thoughtDoc

    const persistence = new IndexeddbPersistence(`${tsid}-thought-${id}`, thoughtDoc)

    // eslint-disable-next-line no-new
    new WebsocketProvider(websocketUrl, `${tsid}-thought-${id}`, thoughtDoc, {
      auth: accessToken,
    })

    thoughtMap.observe(e => {
      if (e.transaction.origin === thoughtDoc.clientID) return
      const thought = getThought(thoughtDoc)!

      store.dispatch((dispatch, getState) => {
        Object.values(thought.childrenMap).forEach(loadThoughtDoc)
        loadLexemeDoc(hashThought(thought.value))

        dispatch(
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
    })

    // TODO: Why do tests cause a TransactionInactiveError? All promises are properly awaited from what I can tell, and the tests pass. Do the docs need to be destroyed on cleanup?
    // In the mean time, stifle the errors to avoid cluttering up the tests.
    persistence.whenSynced
      .catch(err => {
        if (err.toString().includes('TransactionInactiveError')) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(err)
          }
        } else {
          throw err
        }
      })
      .then(() => {
        if (id === HOME_TOKEN) {
          resolveRootSynced(thoughtDocs[HOME_TOKEN]?.getMap().toJSON() as ThoughtDb)
        }
      })
  }

  return thoughtDoc
}

/** Loads a lexeme from the persistence layers and binds the Y.Doc. Reuses the existing Y.Doc if it exists. The Y.Doc is immediately available in lexemeDocs. Lexeme is available on await. */
const loadLexemeDoc = (key: string): Y.Doc => {
  const lexemeDoc = lexemeDocs[key] || new Y.Doc({ guid: `lexeme-${key}` })

  // set up persistence and subscribe to changes
  if (!lexemeDocs[key]) {
    lexemeDocs[key] = lexemeDoc
    const lexemeMap = lexemeDoc.getMap()

    const persistence = new IndexeddbPersistence(`${tsid}-lexeme-${key}`, lexemeDoc)

    // eslint-disable-next-line no-new
    new WebsocketProvider(websocketUrl, `${tsid}-lexeme-${key}`, lexemeDoc, {
      auth: accessToken,
    })

    lexemeMap.observe(e => {
      if (e.transaction.origin === lexemeDoc.clientID) return
      const lexeme = getLexeme(lexemeDoc)!

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

    persistence.whenSynced
      // See: loadThoughtDoc
      .catch(err => {
        if (err.toString().includes('TransactionInactiveError')) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(err)
          }
        } else {
          throw err
        }
      })
  }

  return lexemeDoc
}

/** Gets a Thought from a thought Y.Doc. */
const getThought = (thoughtDoc: Y.Doc): Thought | undefined => {
  const thoughtMap = thoughtDoc.getMap()
  return thoughtMap.size > 0 ? (thoughtMap.toJSON() as Thought) : undefined
}

/** Gets a Lexeme from a lexeme Y.Doc. */
const getLexeme = (lexemeDoc: Y.Doc): Lexeme | undefined => {
  const lexemeMap = lexemeDoc.getMap()
  if (lexemeMap.size === 0) return undefined
  const lexemeRaw = lexemeMap.toJSON()
  return {
    ...lexemeRaw,
    // convert between yjs contexts and state contexts
    // contexts are stored as an object { [key: ThoughtId]: true } in yjs
    // contexts are stored as an array in local state
    // TODO: Change state contexts to objects for consistency
    contexts: Object.keys(lexemeRaw.contexts) as ThoughtId[],
  } as Lexeme
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

  const thoughtUpdatesPromise = Object.entries(thoughtUpdates || {}).map(async ([id, thought]) => {
    // TODO: Why do we get a TransactionInactiveError in tests if we don't await loadThoughtDoc before executing the transaction?
    const thoughtDoc = loadThoughtDoc(id as ThoughtId)
    return updateThoughtDoc(thoughtDoc, thought)
  })

  const lexemeUpdatesPromise = Object.entries(lexemeUpdates || {}).map(async ([id, lexeme]) => {
    // TODO: Why do we get a TransactionInactiveError in tests if we don't await loadThoughtDoc before executing the transaction?
    const lexemeDoc = loadLexemeDoc(id)
    return updateLexemeDoc(lexemeDoc, lexeme)
  })

  return Promise.all([...thoughtUpdatesPromise, ...lexemeUpdatesPromise] as Promise<void>[])
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
export const getLexemeById = async (id: string): Promise<Lexeme | undefined> => {
  const lexemeDoc = loadLexemeDoc(id)
  return getLexeme(lexemeDoc)
}

/** Gets multiple thoughts from the lexemeIndex by Lexeme id. */
export const getLexemesByIds = async (ids: string[]): Promise<(Lexeme | undefined)[]> =>
  Promise.all(ids.map(getLexemeById))

/** Get a thought by id. */
export const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  const thoughtDoc = await loadThoughtDoc(id)
  return getThought(thoughtDoc)
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
