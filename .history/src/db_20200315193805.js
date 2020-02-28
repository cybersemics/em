import Dexie from 'dexie'

const db = new Dexie('EM')

const initDB = async () => {
  db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *contexts, lastUpdated',
    helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion'
  })
  // db.helpers.add({ id: 'EM' })
  const exists = await Dexie.exists('EM')
  db.thoughtIndex.clear()
  db.contextIndex.clear()

  console.log(exists)
}

export const dbOperations = {
  updateThoughtIndex: async (id, thought) => db.thoughtIndex.put({ id, ...thought }),
  deleteThoughtIndex: async id => db.thoughtIndex.delete(id),
  getThoughtIndexById: async id => db.thoughtIndex.get(id),
  getThoughtIndexes: async () => db.thoughtIndex.toArray(),
  updateContextIndex: async (id, context) => db.contextIndex.put({ id, ...context }),
  deleteContextIndex: async id => db.contextIndex.delete(id),
  getContextIndexById: async id => db.contextIndex.get(id),
  getContextIndexes: async () => db.contextIndex.toArray(),
  updateRecentlyEdited: async recentlyEdited => db.helpers.update('EM', { recentlyEdited }),
  updateSchemaVersion: async schemaVersion => db.helpers.update('EM', { schemaVersion }),
  updateLastUpdated: async lastUpdated => db.helpers.update('EM', { lastUpdated }),
  getHelpers: async () => db.helpers.get({ id: 'EM' }),
  updateCursor: async cursor => db.helpers.update('EM', { cursor }),
  deleteCursor: async () => db.helpers.update('EM', { cursor: null }),

}

export default initDB
