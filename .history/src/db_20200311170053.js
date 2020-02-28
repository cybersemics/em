import Dexie from 'dexie'

const db = new Dexie('EM')

const initDB = () => {
  db.version(1).stores({
    thoughtIndex: 'id, value, contexts, created, lastUpdated',
    contextIndex: 'id, contexts'
  })
}

export const thoughtIndexOperations = {
  updateThoughtIndex: (id, thought) => db.table('thoughtIndex').update(id, { thought }),
  deleteThoughtIndex: id => db.table('thoughtIndex').delete(id)

}

export default initDB
