import Dexie from 'dexie'


export function lastUpdatedAddon(db) {
  // Makes it possible to use forEach() instead of each() on collections.
  db.Collection.prototype.setLastUpdated = () => db.Collection.prototype.
}


const db = new Dexie('EM', { addons: [] })

const initDB = () => {
  db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *contexts',
    helpers: 'lastUpdated, recentlyEdited, schemaVersion'
  })
}

export const thoughtIndexOperations = {
  updateThoughtIndex: (id, thought) => db.thoughtIndex.put(thought, id),
  deleteThoughtIndex: id => db.thoughtIndex.delete(id)
}

export default initDB
