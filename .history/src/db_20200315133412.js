import Dexie from 'dexie'

export function lastUpdatedAddon(db) {
  // Makes it possible to use forEach() instead of each() on collections.
  db.Collection.prototype.setLastUpdated = val => {
    db.Collection.prototype.lastUpdated = val
  }
}

// Dexie.delete('EM')
// console.log(Dexie.getDatabaseNames().then(names => console.log(names)))
const db = new Dexie('EM')

// const declareStores = async () => {
//   db.version(1).stores({
//     thoughtIndex: 'id, value, *contexts, created, lastUpdated',
//     contextIndex: 'id, *contexts, lastUpdated',
//     helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion'
//   })
// }

const initDB = async () => {
  db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *contexts, lastUpdated',
    helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion'
  })
  await Dexie.exists('EM')
  console.log
  // if (!exists) {
  //   db = new Dexie('EM')
  //   await declareStores()
  //   db.open()
  // }
  // else {
  //   db = await Dexie.getda
  // }
  // Dexie.exists('EM').then(exists => {
  //   if (!exists) {
  //       db = new Dexie('EM');
  //       await declareStores()
  //       db.open();
  //   }
  // });
  // console.log(db.version(1))

  // db.helpers.add({ id: 'EM' })
}

export const dbOperations = {
  updateThoughtIndex: (id, thought) => db.thoughtIndex.put({ id, ...thought }),
  deleteThoughtIndex: id => db.thoughtIndex.delete(id),
  getThoughtIndexById: id => db.thoughtIndex.get(id),
  getThoughtIndexes: async () => db.thoughtIndex.toArray(),
  updateContextIndex: (id, context) => db.contextIndex.put({ id, ...context }),
  deleteContextIndex: id => db.contextIndex.delete(id),
  getContextIndexById: id => db.contextIndex.get(id),
  getContextIndexes: () => db.contextIndex.toArray(),
  updateRecentlyEdited: recentlyEdited => db.helpers.update('EM', { recentlyEdited }),
  updateSchemaVersion: schemaVersion => db.helpers.update('EM', { schemaVersion }),
  updateLastUpdated: lastUpdated => db.helpers.update('EM', { lastUpdated }),
  getHelpers: () => db.helpers.get({ id: 'EM' }),
  updateCursor: cursor => db.helpers.update('EM', { cursor }),
  deleteCursor: () => db.helpers.update('EM', { cursor: null }),

}

export default initDB
