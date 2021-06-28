/* eslint-disable fp/no-this */
import Dexie from 'dexie'
import { Lexeme, Parent, ThoughtWordsIndex } from '../types'
import SQLite from 'react-native-sqlite-2'
import setGlobalVars from 'indexeddbshim/dist/indexeddbshim-noninvasive'
import { Helper, Log } from './dexie'

const win: { indexedDB?: any; IDBKeyRange?: any } = {}
setGlobalVars(win, {
  checkOrigin: false,
  win: SQLite,
  deleteDatabaseFiles: false,
  useSQLiteIndexes: true,
})

// TODO: Why doesn't this work? Fix IndexedDB during tests.
// mock IndexedDB if tests are running
// NOTE: Could not get this to work in setupTests.js
// See: https://github.com/cybersemics/em/issues/664#issuecomment-629691193

/** Extend Dexie class for proper typing. See https://dexie.org/docs/Typescript. */
// eslint-disable-next-line fp/no-class
class EM extends Dexie {
  contextIndex: Dexie.Table<Parent, string>
  thoughtIndex: Dexie.Table<Lexeme, string>
  thoughtWordsIndex: Dexie.Table<ThoughtWordsIndex, string>
  helpers: Dexie.Table<Helper, string>
  logs: Dexie.Table<Log, number>

  constructor() {
    super('Database', {
      indexedDB: win?.indexedDB,
      IDBKeyRange: win?.IDBKeyRange,
    })

    this.version(1).stores({
      contextIndex: 'id, context, *children, lastUpdated',
      thoughtIndex: 'id, value, *contexts, created, lastUpdated, *words',
      thoughtWordsIndex: 'id, *words',
      helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
      logs: '++id, created, message, stack',
    })

    this.contextIndex = this.table('contextIndex')
    this.thoughtIndex = this.table('thoughtIndex')
    this.thoughtWordsIndex = this.table('thoughtWordsIndex')
    this.helpers = this.table('helpers')
    this.logs = this.table('logs')
  }
}

export { EM }
