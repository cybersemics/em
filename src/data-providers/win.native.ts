import SQLite from 'react-native-sqlite-2'
import setGlobalVars from 'indexeddbshim/dist/indexeddbshim-noninvasive'

const win: { indexedDB?: any; IDBKeyRange?: any } = {}
setGlobalVars(win, {
  checkOrigin: false,
  win: SQLite,
  deleteDatabaseFiles: false,
  useSQLiteIndexes: true,
})

export default win
