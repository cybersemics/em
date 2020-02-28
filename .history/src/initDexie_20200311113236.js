import Dexie from 'dexie'

export const db = new Dexie('MyDatabase')
db.version(1).stores({
  friends: '++id, name, age, *tags',
  gameSessions: 'id, score'
})
