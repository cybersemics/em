import _ from 'lodash'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import ThoughtWithChildren from '../@types/ThoughtWithChildren'
import Timestamp from '../@types/Timestamp'
import updateThoughtsActionCreator from '../action-creators/updateThoughts'
import store from '../stores/app'
import { createChildrenMapFromThoughts } from '../util/createChildrenMap'
import createId from '../util/createId'
import groupObjectBy from '../util/groupObjectBy'
import keyValueBy from '../util/keyValueBy'
import storage from '../util/storage'
import { DataProvider } from './DataProvider'

// Define a unique device id that is the default yjs doc id.
// This can be shared with ?share={deviceId} when connected to a y-websocket server
let deviceId = storage.getItem('deviceId')
if (!deviceId) {
  deviceId = createId()
  storage.setItem('deviceId', deviceId)
}

// access a shared document when the URL contains share={docId}
// otherwise use the deviceId
const shareId = new URLSearchParams(window.location.search).get('share')
const docId = `em/${shareId || deviceId}`
const ydoc = new Y.Doc()

const indexeddbProvider = new IndexeddbPersistence(docId, ydoc)
indexeddbProvider.whenSynced.then(() => {
  // console.info('loaded data from indexed db', yThoughtIndex.size)
})

const websocketProvider = new WebsocketProvider('ws://localhost:1234', docId, ydoc)
websocketProvider.on('status', (event: any) => {
  // console.info('websocket', event.status) // logs "connected" or "disconnected"
})

const yThoughtIndex = ydoc.getMap<ThoughtWithChildren>('thoughtIndex')
const yLexemeIndex = ydoc.getMap<Lexeme>('lexemeIndex')
const yHelpers = ydoc.getMap<string>('helpers')

// Subscribe to yjs thoughts and use as the source of truth.
// Apply yThoughtIndex and yLexemeIndex changes directly to state.
yThoughtIndex.observe(async e => {
  const ids = Array.from(e.keysChanged.keys())
  const thoughts = await getThoughtsByIds(ids)
  const thoughtIndexUpdates = keyValueBy(ids, (id, i) => ({ [id]: thoughts[i] || null }))
  store.dispatch(
    updateThoughtsActionCreator({ thoughtIndexUpdates, lexemeIndexUpdates: {}, local: false, remote: false }),
  )
})
yLexemeIndex.observe(async e => {
  const ids = Array.from(e.keysChanged.keys())
  const lexemes = await getLexemesByIds(ids)
  const lexemeIndexUpdates = keyValueBy(ids, (id, i) => ({ [id]: lexemes[i] || null }))
  store.dispatch(
    updateThoughtsActionCreator({ thoughtIndexUpdates: {}, lexemeIndexUpdates, local: false, remote: false }),
  )
})

// ydoc.on('update', (event, provider, doc, transaction) => {
//   console.info('update', { event, provider, doc, transaction })
// })

// yLexemeIndex.observe(event => {
//   console.info('lexemeIndex updated', yLexemeIndex.size)
// })

/** Atomically updates the thoughtIndex and lexemeIndex. */
export const updateThoughts = async (
  thoughtIndexUpdates: Index<ThoughtWithChildren | null>,
  lexemeIndexUpdates: Index<Lexeme | null>,
  schemaVersion: number,
) => {
  // group thought updates and deletes so that we can use the db bulk functions
  const { update: thoughtUpdates, delete: thoughtDeletes } = groupObjectBy(thoughtIndexUpdates, (id, thought) =>
    thought ? 'update' : 'delete',
  ) as {
    update?: Index<ThoughtWithChildren>
    delete?: Index<null>
  }

  // group lexeme updates and deletes so that we can use the db bulk functions
  const { update: lexemeUpdates, delete: lexemeDeletes } = groupObjectBy(lexemeIndexUpdates, (id, lexeme) =>
    lexeme ? 'update' : 'delete',
  ) as {
    update?: Index<Lexeme>
    delete?: Index<null>
  }

  ydoc.transact(() => {
    Object.entries(thoughtDeletes || {}).forEach(([id]) => {
      yThoughtIndex.delete(id)
    })

    Object.entries(lexemeDeletes || {}).forEach(([id]) => {
      yLexemeIndex.delete(id)
    })

    Object.entries(thoughtUpdates || {}).forEach(([id, thought]) => {
      yThoughtIndex.set(id, thought)
    })

    Object.entries(lexemeUpdates || {}).forEach(([id, lexeme]) => {
      yLexemeIndex.set(id, lexeme)
    })
  }, ydoc.clientID)
}

// setTimeout(() => {
//   yThoughtIndex.clear()
//   yLexemeIndex.clear()
// }, 1000)

/** Clears all thoughts and lexemes from the indices. */
export const clear = async () => {
  yThoughtIndex.clear()
  yLexemeIndex.clear()
}

/** Gets a single lexeme from the lexemeIndex by its id. */
export const getLexemeById = async (id: string) => yLexemeIndex.get(id)

/** Gets multiple thoughts from the lexemeIndex by Lexeme id. */
export const getLexemesByIds = async (keys: string[]) => keys.map(key => yLexemeIndex.get(key))

/** Get a thought by id. */
export const getThoughtById = async (id: string): Promise<Thought | undefined> => {
  const thoughtWithChildren: ThoughtWithChildren | undefined = yThoughtIndex.get(id)
  return thoughtWithChildren
    ? ({
        ..._.omit(thoughtWithChildren, ['children']),
        childrenMap: {
          ...thoughtWithChildren.childrenMap,
          ...createChildrenMapFromThoughts(Object.values(thoughtWithChildren.children || {})),
        },
      } as Thought)
    : undefined
}

/** Get a thought and its children. O(1). */
export const getThoughtWithChildren = async (id: string): Promise<ThoughtWithChildren | undefined> =>
  yThoughtIndex.get(id)

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = async (ids: string[]): Promise<(Thought | undefined)[]> => {
  const thoughtsWithChildren: (ThoughtWithChildren | undefined)[] = ids.map(id => yThoughtIndex.get(id))
  return thoughtsWithChildren.map(thoughtWithChildren =>
    thoughtWithChildren
      ? ({
          ..._.omit(thoughtWithChildren, ['children']),
          childrenMap: createChildrenMapFromThoughts(Object.values(thoughtWithChildren.children || {})),
        } as Thought)
      : undefined,
  )
}

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
export const deleteLexeme = async (id: string) => yLexemeIndex.delete(id)

const db: DataProvider = {
  clear,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtWithChildren,
  getThoughtsByIds,
  updateThoughts,
}

export default db
