import Dexie from 'dexie'
import * as localForage from 'localforage'

const db = new Dexie('EM')

const migrateToDexie = async () => {
  const {
    cursor,
    lastUpdated,
    recentlyEdited,
    schemaVersion,
  } = await localForage.getItems([
    'cursor',
    'lastUpdated',
    'recentlyEdited',
    'schemaVersion',
  ])

  await localForage.startsWith('thoughtIndex-').then(results => {
    for (const key in results) { // eslint-disable-line fp/no-loops
      const value = results[key]
      const hash = key.substring(THOUGHTINDEX_KEY_START)
      newState.thoughtIndex[hash] = value
    }
  })
}

const initDB = async () => {
  await db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *context, lastUpdated',
    helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion'
  })
  const staticHelpersExist = await db.helpers.get({ id: 'EM' })
  if (!staticHelpersExist) {
    await db.helpers.add({ id: 'EM' })
  }
  const exists = await Dexie.exists('EM')
}

export const dbOperations = {
  updateThoughtIndex: async (id, thought) => db.thoughtIndex.put({ id, ...thought }),
  deleteThoughtIndex: async id => db.thoughtIndex.delete(id),
  getThoughtIndexById: async id => db.thoughtIndex.get(id),
  getThoughtIndexes: async () => db.thoughtIndex.toArray(),
  updateContextIndex: async (id, context) => db.contextIndex.put({ id, context }),
  deleteContextIndex: async id => db.contextIndex.delete(id),
  getContextIndexes: async () => db.contextIndex.toArray(),
  updateRecentlyEdited: async recentlyEdited => db.helpers.update('EM', { recentlyEdited }),
  updateSchemaVersion: async schemaVersion => db.helpers.update('EM', { schemaVersion }),
  updateLastUpdated: async lastUpdated => db.helpers.update('EM', { lastUpdated }),
  getHelpers: async () => db.helpers.get({ id: 'EM' }),
  updateCursor: async cursor => db.helpers.update('EM', { cursor }),
  deleteCursor: async () => db.helpers.update('EM', { cursor: null }),
}

export default initDB
