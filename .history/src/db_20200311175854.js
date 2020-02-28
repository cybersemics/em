import Dexie from 'dexie'

const db = new Dexie('EM')

export function ForEachAddon(db) {
  // Makes it possible to use forEach() instead of each() on collections.
  db.Collection.prototype.forEach = db.Collection.prototype.each
}

// Register the addon to be included by default (optional)
Dexie.addons.push(ForEachAddon)

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
