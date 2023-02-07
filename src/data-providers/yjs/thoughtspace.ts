import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Thought from '../../@types/Thought'
import ThoughtDb from '../../@types/ThoughtDb'
import Timestamp from '../../@types/Timestamp'
import updateThoughtsActionCreator from '../../action-creators/updateThoughts'
import { ydoc } from '../../data-providers/yjs/index'
import store from '../../stores/app'
import groupObjectBy from '../../util/groupObjectBy'
import initialState from '../../util/initialState'
import keyValueBy from '../../util/keyValueBy'
import thoughtToDb from '../../util/thoughtToDb'
import { DataProvider } from '../DataProvider'

const yThoughtIndex = ydoc.getMap<ThoughtDb>('thoughtIndex')
const yLexemeIndex = ydoc.getMap<Lexeme>('lexemeIndex')
const yHelpers = ydoc.getMap<string | number>('helpers')

/** Atomically updates the thoughtIndex and lexemeIndex. */
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

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  ydoc.transact(() => {
    yThoughtIndex.clear()
    yLexemeIndex.clear()

    // reset to initialState, otherwise a missing ROOT error will occur when yThoughtIndex.observe is triggered
    const state = initialState()
    const thoughWithChildrentUpdates = keyValueBy(state.thoughts.thoughtIndex, (id, thought) => ({
      [id]: thoughtToDb(thought),
    }))

    Object.entries(thoughWithChildrentUpdates).forEach(([id, thought]) => yThoughtIndex.set(id, thought))
    Object.entries(state.thoughts.lexemeIndex).forEach(([key, lexeme]) => yLexemeIndex.set(key, lexeme))
  })
}

/** Gets a single lexeme from the lexemeIndex by its id. */
export const getLexemeById = async (id: string) => yLexemeIndex.get(id)

/** Gets multiple thoughts from the lexemeIndex by Lexeme id. */
export const getLexemesByIds = async (keys: string[]) => keys.map(key => yLexemeIndex.get(key))

/** Get a thought by id. */
export const getThoughtById = async (id: string): Promise<Thought | undefined> => yThoughtIndex.get(id)

/** Get a thought and its children. O(1). */
export const getThoughtWithChildren = async (id: string): Promise<ThoughtDb | undefined> => yThoughtIndex.get(id)

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = async (ids: string[]): Promise<(Thought | undefined)[]> =>
  ids.map(id => yThoughtIndex.get(id))

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

// Subscribe to yjs thoughts and use as the source of truth.
// Apply yThoughtIndex and yLexemeIndex changes directly to state.
yThoughtIndex.observe(async e => {
  if (e.transaction.origin === ydoc.clientID) return
  const ids = Array.from(e.keysChanged.keys())
  const thoughts = await getThoughtsByIds(ids)
  const thoughtIndexUpdates = keyValueBy(ids, (id, i) => ({ [id]: thoughts[i] || null }))
  store.dispatch(
    updateThoughtsActionCreator({
      thoughtIndexUpdates,
      lexemeIndexUpdates: {},
      local: false,
      remote: false,
      repairCursor: true,
    }),
  )
})
yLexemeIndex.observe(async e => {
  if (e.transaction.origin === ydoc.clientID) return
  const ids = Array.from(e.keysChanged.keys())
  const lexemes = await getLexemesByIds(ids)
  const lexemeIndexUpdates = keyValueBy(ids, (id, i) => ({ [id]: lexemes[i] || null }))
  store.dispatch(
    updateThoughtsActionCreator({
      thoughtIndexUpdates: {},
      lexemeIndexUpdates,
      local: false,
      remote: false,
      repairCursor: true,
    }),
  )
})

const db: DataProvider = {
  clear,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
