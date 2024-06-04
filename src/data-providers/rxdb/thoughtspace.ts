import { RxCollection, RxDatabase, addRxPlugin, createRxDatabase } from 'rxdb'
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { LexemeDocType, lexemeSchema } from './schemas/lexeme'
import { ThoughtDocType, thoughtSchema } from './schemas/thought'

if (import.meta.env.MODE !== 'production') {
  addRxPlugin(RxDBDevModePlugin)
}

const DATABASE_NAME = 'em'

type EmRxDB = RxDatabase<{
  thoughts: RxCollection<ThoughtDocType>
  lexemes: RxCollection<LexemeDocType>
}>

/* rxDB database */
export let rxDB: EmRxDB

/** Initialize the thoughtspace. */
export const init = async () => {
  rxDB = await createRxDatabase({
    name: DATABASE_NAME,
    storage: getRxStorageIndexedDB(),
  })

  await rxDB.addCollections({
    thoughts: {
      schema: thoughtSchema,
    },
    lexemes: {
      schema: lexemeSchema,
    },
  })
}
