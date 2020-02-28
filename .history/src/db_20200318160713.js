import Dexie from 'dexie'

const db = new Dexie('EM')

const initHelpers = async () => {
  db.helpers.clear()
  await db.helpers.put({ id: 'EM', cursor: 'xyz' })
  const y = await db.helpers.toArray()
  console.log('1', y)
  await db.helpers.put({ id: 'EM' })
  const x = await db.helpers.toArray()
  console.log('2', x)
  // if (!staticHelpersExist) {
  //   await db.helpers.add({ id: 'EM' })
  // }
}

const initDB = async () => {
  await db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *context, lastUpdated',
    helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion'
  })
  await initHelpers()
}

export const updateThoughtIndex = async (id, thought) => db.thoughtIndex.put({ id, ...thought })
export const deleteThoughtIndex = async id => db.thoughtIndex.delete(id)
export const getThoughtIndexById = async id => db.thoughtIndex.get(id)
export const getThoughtIndexes = async () => db.thoughtIndex.toArray()
export const updateContextIndex = async (id, context) => db.contextIndex.put({ id, context })
export const deleteContextIndex = async id => db.contextIndex.delete(id)
export const getContextIndexes = async () => db.contextIndex.toArray()
export const updateRecentlyEdited = async recentlyEdited => db.helpers.update('EM', { recentlyEdited })
export const updateSchemaVersion = async schemaVersion => db.helpers.update('EM', { schemaVersion })
export const updateLastUpdated = async lastUpdated => db.helpers.update('EM', { lastUpdated })
export const getHelpers = async () => db.helpers.get({ id: 'EM' })
export const updateCursor = async cursor => db.helpers.update('EM', { cursor })
export const deleteCursor = async () => db.helpers.update('EM', { cursor: null })

export default initDB
