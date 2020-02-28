import Dexie from 'dexie'

const db = new Dexie('EM')
db.version(1).stores({
  thoughtIndex: 'id, value, contexts, created, lastUpdated',
  contextIndex: 'id, contexts'
})

export default db
