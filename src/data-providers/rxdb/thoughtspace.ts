import { merge } from 'lodash'
import {
  RxCollection,
  RxConflictHandler,
  RxConflictHandlerInput,
  RxConflictHandlerOutput,
  RxDatabase,
  addRxPlugin,
  createRxDatabase,
  deepEqual,
} from 'rxdb'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { getConnectionHandlerSimplePeer, replicateWebRTC } from 'rxdb/plugins/replication-webrtc'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { tsid } from '../yjs'
import { RxLexeme, lexemeSchema } from './schemas/lexeme'
import { RxPermission, permissionSchema } from './schemas/permission'
import { RxThought, thoughtSchema } from './schemas/thought'

if (import.meta.env.MODE === 'development') {
  addRxPlugin(RxDBDevModePlugin)
}

const DATABASE_NAME = 'em'

type EmRxDBCollections = {
  thoughts: RxCollection<RxThought>
  lexemes: RxCollection<RxLexeme>
  permissions: RxCollection<RxPermission>
}

type EmRxDB = RxDatabase<EmRxDBCollections>

/* rxDB database */
export let rxDB: EmRxDB

/** Initialize the thoughtspace. */
export const init = async () => {
  const testSuffix = import.meta.env.MODE === 'test' ? getDBSuffix() : ''
  rxDB = await getDatabase({ suffix: testSuffix })
  await addCollectionsToDb(rxDB)
  addReplicationHandlers()
}

/** Get a suffix for the database name. Useful for testing. */
function getDBSuffix() {
  const now = Date.now()
  const randomNumber = Math.floor(Math.random() * 1000)
  return `-test-${now}-${randomNumber}`
}

/** Get RxDB database with dexie/indexed storage. */
async function getDatabase({ suffix = '' }: { suffix?: string } = {}) {
  return createRxDatabase<EmRxDB>({
    name: `${DATABASE_NAME}${suffix}`,
    storage: await getRxStorage(),
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

/** Add collections to the database. */
async function addCollectionsToDb(db: EmRxDB): Promise<EmRxDBCollections> {
  const defaultConflictHandler: RxConflictHandler<any> = function (
    i: RxConflictHandlerInput<any>,
  ): Promise<RxConflictHandlerOutput<any>> {
    /** Ignore undefined properties. */
    const ignoreUndefined = (obj: any) => {
      return Object.keys(obj).reduce((acc: any, key) => {
        if (obj[key] !== undefined) {
          acc[key] = obj[key]
        }
        return acc
      }, {})
    }

    const newDocumentState = ignoreUndefined(i.newDocumentState)
    const realMasterState = ignoreUndefined(i.realMasterState)
    if (deepEqual(newDocumentState, realMasterState)) {
      return Promise.resolve({
        isEqual: true,
      })
    }

    const mergedDoc = merge({}, realMasterState, newDocumentState)
    return Promise.resolve({
      isEqual: false,
      documentData: mergedDoc,
    })
  }

  return db.addCollections({
    thoughts: {
      schema: thoughtSchema,
      conflictHandler: defaultConflictHandler,
    },
    lexemes: {
      schema: lexemeSchema,
      conflictHandler: defaultConflictHandler,
    },
    permissions: {
      schema: permissionSchema,
    },
  })
}

/** Replication handler. */
async function addReplicationHandlers() {
  const host = import.meta.env.VITE_WEBRTC_HOST || 'localhost'
  const port = import.meta.env.VITE_WEBRTC_PORT || (host === 'localhost' ? 3001 : '')
  const protocol = host === 'localhost' ? 'ws' : 'wss'
  const webRTCUrl = `${protocol}://${host}${port ? ':' + port : ''}/`

  polyfillProcessNextTick()
  createThoughtsReplication()
  createLexemesReplication()

  /** Polyfill process.nextTick for the browser. */
  function polyfillProcessNextTick() {
    window.process = {
      ...(window.process || {}),
      nextTick: (fn, ...args) => setTimeout(() => fn(...args)),
    }
  }

  /** Create thoughts replication. */
  async function createThoughtsReplication() {
    const replicationPool = await replicateWebRTC({
      collection: rxDB.thoughts,
      topic: `${tsid}-thoughts`,
      connectionHandlerCreator: getConnectionHandlerSimplePeer({
        signalingServerUrl: webRTCUrl,
      }),
      pull: {},
      push: {},
    })

    replicationPool.error$.subscribe(err => {
      console.error('rxdb/thoughtspace.ts -> thoughts replication error:', err)
    })
  }

  /** Create lexemes replication. */
  async function createLexemesReplication() {
    const replicationPool = await replicateWebRTC({
      collection: rxDB.lexemes,
      topic: `${tsid}-lexemes`,
      connectionHandlerCreator: getConnectionHandlerSimplePeer({
        signalingServerUrl: webRTCUrl,
      }),
      pull: {},
      push: {},
    })

    replicationPool.error$.subscribe(err => {
      console.error('rxdb/thoughtspace.ts -> lexemes replication error:', err)
    })
  }
}
