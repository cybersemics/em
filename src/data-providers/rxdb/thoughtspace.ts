import { RxCollection, RxDatabase, addRxPlugin, createRxDatabase } from 'rxdb'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
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

/** Initialize the thoughtspace. */
export const init = async () => {
  const isTestEnv = import.meta.env.MODE === 'test'
  const database = getDatabase()

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
  async function getDatabase(): Promise<EmRxDB> {
    const testPrefix = isTestEnv ? `-test-${Date.now()}-${Math.floor(Math.random() * 1000)}` : ''
    return createRxDatabase({
      name: `${testPrefix}${DATABASE_NAME}`,
      storage: await getRxStorage(),
      ignoreDuplicate: isTestEnv,
    })

    /** Get RxDB storage. */
    async function getRxStorage(): Promise<RxDatabase['storage']> {
      if (import.meta.env.VITE_USE_RXDB_PREMIUM === 'true') {
        try {
          /*
            We need to import the plugin using an alias because the plugig will be installed
            only in production and when the environment variable is set to true.
            Vite will throw an error if we try to import a non-existent module.
           */
          // @ts-expect-error supress warning about types for rxdb-indexeddb
          const { getRxStorageIndexedDB } = await import('rxdb-indexeddb')
          return getRxStorageIndexedDB()
        } catch (e) {
          console.error('RxDB Premium not installed.')
        }
      }

      return getRxStorageDexie()
    }
  }
}
