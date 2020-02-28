import Dexie from 'dexie'

const db = new Dexie('EM')

const initDB = () => {
  db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *contexts',
    helpers: 'lastUpdated, recentlyEdited, schemaVersion'
  })
}

export const thoughtIndexOperations = {
  updateThoughtIndex: (id, thought) => db.thoughtIndex.put(thought, id),
  deleteThoughtIndex: id => db.thoughtIndex.delete(id),
  setLastUpdated: value => db.lastUpdated.put(value)
}

export default initDB
