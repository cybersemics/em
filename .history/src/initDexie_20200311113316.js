import Dexie from 'dexie'

const db = new Dexie('EM')
db.version(1).stores({
  // friends: '++id, name, age, *tags',
  // gameSessions: 'id, score'
})

export default db
