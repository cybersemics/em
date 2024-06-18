import { RxCollection, RxDatabase, addRxPlugin, createRxDatabase } from 'rxdb'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
import { RxLexeme, lexemeSchema } from './schemas/lexeme'
import { RxPermission, permissionSchema } from './schemas/permission'
import { RxThought, thoughtSchema } from './schemas/thought'

if (import.meta.env.MODE === 'development') {
  addRxPlugin(RxDBDevModePlugin)
}

const DATABASE_NAME = 'em'

type EmRxDB = RxDatabase<{
  thoughts: RxCollection<RxThought>
  lexemes: RxCollection<RxLexeme>
  permissions: RxCollection<RxPermission>
}>

/* rxDB database */
export let rxDB: EmRxDB

/** Destroy the rxDB database. */
export const destroyRxDB = async () => {
  if (!rxDB) return

  rxDB.destroy()

  // TODO - fix this rxDB type issue, we should work on it when refactoring this file.
  rxDB = undefined as unknown as EmRxDB
}

/** Initialize the thoughtspace. */
export const init = async () => {
  const isTestEnv = import.meta.env.MODE === 'test'
  const database = isTestEnv ? getTestDatabase() : getDatabase()

  rxDB = await database

  await rxDB.addCollections({
    thoughts: {
      schema: thoughtSchema,
    },
    lexemes: {
      schema: lexemeSchema,
    },
    permissions: {
      schema: permissionSchema,
    },
  })

  /** Get RxDB development/production database. */
  function getDatabase(): Promise<EmRxDB> {
    return createRxDatabase({
      name: DATABASE_NAME,
      storage: getRxStorageDexie(),
    })
  }

  /** Get RxDB test database. */
  function getTestDatabase(): Promise<EmRxDB> {
    return createRxDatabase({
      name: `${DATABASE_NAME}-test-${Date.now()}`,
      storage: getRxStorageMemory(),
      ignoreDuplicate: true,
    })
  }
}
