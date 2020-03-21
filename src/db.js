import Dexie from 'dexie'
import _ from 'lodash'

const db = new Dexie('EM')

const initHelpers = async () => {
  const staticHelpersExist = await db.helpers.get({ id: 'EM' })
  if (!staticHelpersExist) {
    await db.helpers.add({ id: 'EM' })
  }
}

const initDB = async () => {
  await db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *context, lastUpdated',
    helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion'
  })
  await initHelpers()
}

export const updateThought = async (id, thought) => db.thoughtIndex.put({ id, ...thought })
export const updateThoughtIndex = async thoughtIndexMap => {
  const thoughtsArray = Object.keys(thoughtIndexMap).map(key => ({ ...thoughtIndexMap[key], id: key }))
  return db.thoughtIndex.bulkPut(thoughtsArray)
}
export const deleteThought = async id => db.thoughtIndex.delete(id)
export const getThought = async id => db.thoughtIndex.get(id)
export const getThoughtIndex = async () => {
  const thoughtIndexMap = await db.thoughtIndex.toArray()
  return _.keyBy(thoughtIndexMap, 'id')
}
export const updateContext = async (id, context) => db.contextIndex.put({ id, context })
export const updateContextIndex = async contextIndexMap => {
  const contextsArray = Object.keys(contextIndexMap).map(key => ({ id: key, context: contextIndexMap[key] }))
  return db.contextIndex.bulkPut(contextsArray)
}
export const deleteContext = async id => db.contextIndex.delete(id)
export const getContextIndex = async () => {
  const contextIndexMap = await db.contextIndex.toArray()
  return contextIndexMap.reduce((acc, { id, context }) => ({ ...acc, [id]: context }), {})
}
export const updateRecentlyEdited = async recentlyEdited => db.helpers.update('EM', { recentlyEdited })
export const updateSchemaVersion = async schemaVersion => db.helpers.update('EM', { schemaVersion })
export const updateLastUpdated = async lastUpdated => db.helpers.update('EM', { lastUpdated })
export const getHelpers = async () => db.helpers.get({ id: 'EM' })
export const updateCursor = async cursor => db.helpers.update('EM', { cursor })
export const deleteCursor = async () => db.helpers.update('EM', { cursor: null })

export default initDB
