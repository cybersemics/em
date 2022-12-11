import _ from 'lodash'
import { IndexeddbPersistence } from 'y-indexeddb'
// import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import ThoughtWithChildren from '../@types/ThoughtWithChildren'
import { createChildrenMapFromThoughts } from '../util/createChildrenMap'
import groupObjectBy from '../util/groupObjectBy'
import { DataProvider } from './DataProvider'

const ydoc = new Y.Doc()

const indexeddbProvider = new IndexeddbPersistence('em', ydoc)
indexeddbProvider.whenSynced.then(() => {
  // console.log('loaded data from indexed db', yThoughtIndex.size)
})

// const websocketProvider = new WebsocketProvider('ws://localhost:1234', 'em', ydoc)
// websocketProvider.on('status', (event: any) => {
//   console.log(event.status) // logs "connected" or "disconnected"
// })

// array of numbers which produce a sum
const yThoughtIndex = ydoc.getMap<ThoughtWithChildren>('em')
const yLexemeIndex = ydoc.getMap<Lexeme>('em')
const yHelpers = ydoc.getMap<string>('em')

// yThoughtIndex.observe(event => {
//   console.log('thoughtIndex updated', yThoughtIndex.size)
// })

// yLexemeIndex.observe(event => {
//   console.log('lexemeIndex updated', yLexemeIndex.size)
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

const ydb: DataProvider = {
  clear,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtWithChildren,
  getThoughtsByIds,
  updateThoughts,
}

export default ydb
