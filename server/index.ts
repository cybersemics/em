import { Server } from '@hocuspocus/server'
// eslint-disable-next-line fp/no-events
import { EventEmitter } from 'events'
import fs from 'fs'
import level from 'level'
import path from 'path'
import { LeveldbPersistence } from 'y-leveldb'
import * as Y from 'yjs'
import DocLogAction from '../src/@types/DocLogAction'
import Share from '../src/@types/Share'
import ThoughtId from '../src/@types/ThoughtId'
import {
  encodeDocLogDocumentName,
  encodeLexemeDocumentName,
  encodePermissionsDocumentName,
  encodeThoughtDocumentName,
  parseDocumentName,
} from '../src/data-providers/yjs/documentNameEncoder'
import replicationController from '../src/data-providers/yjs/replicationController'
import sleep from '../src/util/sleep'
import taskQueue from '../src/util/taskQueue'
import throttleConcat from '../src/util/throttleConcat'
import timestamp from '../src/util/timestamp'

// bump maxListeners to avoid warnings when many websocket connections are created
EventEmitter.defaultMaxListeners = 1000000

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error'

/** Number of milliseconds to throttle db.storeUpdate on Doc update. */
const THROTTLE_STOREUPDATE = 1000

/** Timeout for bindState before logging a warning. */
const SLOW_LEVELDB_WARNING_TIMEOUT = 5000

const port = process.env.PORT ? +process.env.PORT : 3001
// must match the db directory used in backup.sh and the clear npm script
const dbDir = process.env.DB_DIR || 'db'
const thoughtsDbBasePath = `${dbDir}/thoughts`
const doclogDbBasePath = `${dbDir}/doclogs`
const replicationCursorDbBasePath = `${dbDir}/replicationCursor`

// contains a top level map for each thoughtspace Map<Share> mapping token -> permission
const permissionsServerDoc = new Y.Doc()

/** Shows the first n characters of a string and replaces the rest with an ellipsis. */
const mask = (s: string, n = 4) => `${s.slice(0, n)}...`

/** Gets a Doc that is loaded on the server by name. Docs are added to the server onLoadDocument, and (presumably) removed on disconnect. */
const getServerDoc = (name: string): Y.Doc | undefined => server?.documents.get(name)

/** Make text gray in the console. */
const gray = (s: string) => `\x1B[90m${s}\x1b[0m`

/** Logs a message to the console with an ISO timestamp. Optionally takes a console method for its last argument. Defaults to info. */
const log = (...args: [...any, ...([ConsoleMethod] | [])]) => {
  // prepend timestamp
  args = [gray(new Date().toISOString()), ...args]

  // default to console.info
  // override the method by passing { method: 'error' } as the last argument
  let method: ConsoleMethod = 'info'
  const lastArg = args[args.length - 1]
  if (typeof lastArg === 'object' && Object.keys(lastArg).length === 1 && lastArg.method) {
    args = args.slice(0, -1)
    method = lastArg.method
  }

  // eslint-disable-next-line no-console
  console[method](...args)
}

// setup db data directory
// TODO: How to create data/thoughtspaces/${tsid}/ and then persist into thoughts/ or doclogs/? That would be a nicer file structure, but it causes "directory does not exist" or lock errors.
fs.mkdirSync(thoughtsDbBasePath, { recursive: true })
fs.mkdirSync(doclogDbBasePath, { recursive: true })
fs.mkdirSync(replicationCursorDbBasePath, { recursive: true })

const ldbPermissions = new LeveldbPersistence(`${dbDir}/permissions`)
// indexed by tsid
// set on loadDocument (idempotent)
// deleted when doclog disconnects
const ldbThoughtspaces = new Map<string, LeveldbPersistence>()
const ldbDoclogs = new Map<string, LeveldbPersistence>()
const ldbReplicationCursors = new Map<string, level.LevelDB>()

// Store promises per tsid that resolve when the database is ready to be created.
// An unset value is ready.
// Otherwise we can get an IO LOCK error from level db when trying to re-create a db at the same location before previous transactions have been flushed and the connection closed.
const ldbThoughtspacesReady = new Map<string, Promise<void>>()
const ldbDoclogsReady = new Map<string, Promise<void>>()

// In order to safely unload dbs on disconnect, we need to wait for all storeUpdates to resolve.
// Otherwise, when the user refreshes the page during an import, it can cause [ReadError]: Database is not open.
// Each thoughtspace is given a taskQueue which tracks storeUpdate promises.
// onDisconnect can thus await the taskQueue to ensure that all updates are saved to disk.
const storeUpdateTaskQueues = new Map<string, ReturnType<typeof taskQueue>>()

/** Open the thoughtspace db and cache the db reference in ldbThoughtspaces. */
const openThoughtspaceDb = async (tsid: string): Promise<LeveldbPersistence> => {
  // wait a tick, otherwise ldbThoughtspacesReady might not be populated with the promise from the last onDisconnect
  // i.e. the database is closing
  await sleep(0)
  await ldbThoughtspacesReady.get(tsid)
  let db = ldbThoughtspaces.get(tsid)
  if (!db) {
    db = new LeveldbPersistence(path.join(thoughtsDbBasePath, tsid))
    ldbThoughtspaces.set(tsid, db)
  }
  return db
}

/** Open the thoughtspace db and cache the db reference in ldbThoughtspaces. */
const openDoclogDb = async (tsid: string): Promise<LeveldbPersistence> => {
  // wait a tick, otherwise ldbDoclogsReady might not be populated with the promise from the last onDisconnect
  // i.e. the database is closing
  await sleep(0)

  await ldbDoclogsReady.get(tsid)
  let db = ldbDoclogs.get(tsid)
  if (!db) {
    db = new LeveldbPersistence(path.join(doclogDbBasePath, tsid))
    ldbDoclogs.set(tsid, db)
  }

  // initialize storeUpdate taskQueue for the thoughtspace
  let queue = storeUpdateTaskQueues.get(tsid)
  if (!queue) {
    queue = taskQueue({ concurrency: Infinity })
    storeUpdateTaskQueues.set(tsid, queue)
  }

  return db
}

/** Open the replicationCursor level db for the given tsid and cache the db reference in ldbReplicationCursors. */
const loadReplicationCursorDb = (tsid: string): level.LevelDB => {
  let replicationCursorDb = ldbReplicationCursors.get(tsid)
  if (!replicationCursorDb) {
    replicationCursorDb = level(path.join(replicationCursorDbBasePath, tsid), { valueEncoding: 'json' })
    ldbReplicationCursors.set(tsid, replicationCursorDb)
  }
  return replicationCursorDb
}

/** Closes the replicationCursorDb for the given tsid and removes the closed db instance from the ldbReplicationCursors cache. Does nothing if ldbReplicationCursors does not contain a db with the given tsid. */
const unloadReplicationCursorDb = async (tsid: string): Promise<void> => {
  const replicationCursorDb = ldbReplicationCursors.get(tsid)
  if (replicationCursorDb) {
    await replicationCursorDb.close()
    ldbReplicationCursors.delete(tsid)
  }
}

/** Sync the initial state of the given in-memory doc with the level db. */
// WARNING: There is currently a bug that causes db.getYDoc to hang or take an inordinate amount of time (~265 sec) on a large initial replication.
// https://github.com/cybersemics/em/issues/1725
const initState = async ({
  db,
  docName,
  doc,
}: {
  db: LeveldbPersistence
  docName: string
  doc: Y.Doc
}): Promise<void> => {
  // measures the time that getYDoc or storeUpdate takes when BIND_TIMEOUT is exceeded
  let t: number | undefined

  let timeout = setTimeout(() => {
    t = performance.now()
  }, SLOW_LEVELDB_WARNING_TIMEOUT)

  const docPersisted = await db.getYDoc(docName)

  clearTimeout(timeout)

  if (t) {
    console.warn(
      `Slow db.getYDoc completed in ${Math.round((performance.now() - t + SLOW_LEVELDB_WARNING_TIMEOUT) / 1000)} sec`,
      docName,
    )
  }

  // store initial state of Doc if non-empty
  const update = Y.encodeStateAsUpdate(doc)
  if (update.length > 2) {
    timeout = setTimeout(() => {
      t = performance.now()
    }, SLOW_LEVELDB_WARNING_TIMEOUT)

    const stored = db.storeUpdate(docName, update).catch(e => {
      console.error('initState: storeUpdate', e)
    })
    const { tsid } = parseDocumentName(docName)
    storeUpdateTaskQueues.get(tsid)?.add([() => stored])
    await stored

    clearTimeout(timeout)

    if (t) {
      console.warn(
        `Slow db.storeUpdate completed in ${Math.round(
          (performance.now() - t + SLOW_LEVELDB_WARNING_TIMEOUT) / 1000,
        )} sec`,
        docName,
      )
    }
  }

  Y.applyUpdate(doc, Y.encodeStateAsUpdate(docPersisted))
}

/** Syncs a doc with leveldb and subscribes to updates (throttled). Resolves when the initial state is stored. Returns a cleanup function that should be called to ensure throttled updates gets flushed to leveldb. */
// Note: @hocuspocus/extension-database is not incremental; all data is re-saved every debounced 2 sec, so we do our own throttled storage with throttleConcat.
// https://tiptap.dev/hocuspocus/server/extensions#database
const bindState = async ({
  db,
  docName,
  doc,
}: {
  db: LeveldbPersistence
  docName: string
  doc: Y.Doc
}): Promise<void> => {
  // We must await initState in order to block onLoadDocument, otherwise the server can return an empty Doc.
  // WARNING: There is currently a bug that causes db.getYDoc to hang or take an inordinate amount of time (~265 sec) on a large initial replication.
  // https://github.com/cybersemics/em/issues/1725
  await initState({ db, docName, doc })

  // throttled update handler accumulates and merges updates
  const storeUpdateThrottled = throttleConcat(
    // Note: Is it a problem that mergeUpdates does not perform garbage collection?
    // https://discuss.yjs.dev/t/throttling-yjs-updates-with-garbage-collection/1423
    (updates: Uint8Array[]) => {
      if (updates.length === 0) return
      const stored = db.storeUpdate(docName, Y.mergeUpdates(updates)).catch(e => {
        console.error('bindState: storeUpdate', e)
      })

      const { tsid } = parseDocumentName(docName)
      storeUpdateTaskQueues.get(tsid)?.add([() => stored])

      return stored
    },
    THROTTLE_STOREUPDATE,
  )

  doc.on('update', storeUpdateThrottled)

  // Immediately store all updates on destroy, otherwise queued updates can be missed when the db closes.
  // TODO: Flushing updates on destroy negates the benefits of throttling during editing, since Lexemes are rapidly created and deleted. Is there a way to defer updates without causing a race condition during editing?
  doc.on('destroy', storeUpdateThrottled.flush)
}

/** Authenticates a document request with the given access token. Handles Docs for Thoughts, Lexemes, and Permissions. Assigns the token as owner if it is a new document. Throws an error if the access token is not authorized. */
export const onAuthenticate = async ({ token, documentName }: { documentName: string; token: string }) => {
  const { tsid } = parseDocumentName(documentName)
  // the server-side permissions map
  // stores the permissions for all thoughtspaces as Map<Index<Share>> (indexed by tsid and access token)
  // only accessible on the server
  const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)

  // if the document has no owner, automatically assign the current user as owner
  if (permissionsServerMap.size === 0) {
    log(`assigning owner ${mask(token)} to new thoughtspace ${tsid}`)
    permissionsServerMap.set(token, { accessed: timestamp(), created: timestamp(), name: 'Owner', role: 'owner' })
  }

  // authenicate existing owner
  // authenticate new documents
  if (permissionsServerMap.get(token)?.role !== 'owner') {
    console.error(`${mask(token)} not authorized to access thoughtspace ${tsid}`)
    throw new Error('Not authorized')
  }

  // passed forward as data.context to later hooks
  return { token }
}

/** Syncs permissions to permissionsClientDoc on load. The permissionsServerDoc cannot be exposed since it contains permissions for all thoughtspaces. This must be done in onLoadDocument when permissionsClientDoc has been created through the websocket connection. */
export const onLoadDocument = async ({
  context,
  document,
  documentName,
}: {
  context: { token: string }
  document: Y.Doc
  documentName: string
}) => {
  const { token } = context
  const { tsid, type } = parseDocumentName(documentName)
  const permissionsDocName = encodePermissionsDocumentName(tsid)
  const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)
  const permission = permissionsServerMap.get(token)

  if (!permission || permission.role !== 'owner') return

  // Copy permissions from the server-side permissions doc to the client-side permission doc.
  // The server-side permissions doc keeps all permissions for all documents in memory.
  // The client-side permissions doc uses authentication and can be exposed to the client via websocket.
  // update last accessed time on auth
  if (type === 'permissions') {
    // disable accessed in the permissionsServerMap; it does not need a CRDT
    // floor accessed to nearest second to avoid churn
    // permissionsServerMap.set(token, { ...permission, accessed: (Math.floor(timestamp() / 1000) * 1000) as Timestamp })

    const permissionsClientDoc = getServerDoc(permissionsDocName)
    if (!permissionsClientDoc) return

    const permissionsClientMap = permissionsClientDoc.getMap<Share>()

    // copy server permissions to client
    permissionsServerMap.forEach((permission: Share, token: string) => {
      permissionsClientMap.set(token, permission)
    })

    // sync client permissions to server
    // TODO: Is there a way to 2-way sync only the updates for this tsid?
    // TODO: unobserve
    permissionsClientMap?.observe(e => {
      e.changes.keys.forEach((change, key) => {
        if (change.action === 'delete') {
          permissionsServerMap.delete(key)
        } else {
          const clientShare = permissionsClientMap.get(key)
          const serverShare = permissionsServerMap.get(key)

          // do not copy empty clientShare to server
          // (we can assume serverShare exists since onAuthenticate passed)
          if (!clientShare) return

          // compare name and role
          // do not compare created and accessed, since the server is assumed to be the source of truth
          if (clientShare?.name !== serverShare?.name || clientShare?.role !== serverShare?.role) {
            permissionsServerMap.set(key, permissionsClientMap.get(key)!)
          }
        }
      })
    })
  } else if (type === 'thought' || type === 'lexeme') {
    const db = await openThoughtspaceDb(tsid)
    await bindState({ db, docName: documentName, doc: document })
  } else if (type === 'doclog') {
    const db = await openDoclogDb(tsid)
    await bindState({ db, docName: documentName, doc: document })

    // Use a replicationController to track thought and lexeme deletes in the doclog.
    // Clears persisted documents that have been deleted, even if the client disconnects.
    // Note: It is recommended to clear all contexts from a Lexeme before deleting it to mitigate re-entry bugs if a new Lexeme with the same key is created quickly after a delete.
    replicationController({
      doc: document,
      // If the client has already disconnected, then we need to destroy the db reference and delete the ldbThoughtspace entry.
      // Not yet observed in practice, but could happen in theory.
      onEnd: async () => {
        const db = ldbThoughtspaces.get(tsid)
        // if the tsid does not exist in server.documents, we can safely (?) assume the client has disconnected
        if (db && !getServerDoc(encodeDocLogDocumentName(tsid))) {
          const destroyed = db.destroy()
          ldbDoclogsReady.set(tsid, destroyed)
          destroyed.finally(() => {
            ldbDoclogsReady.delete(tsid)
            ldbThoughtspaces.delete(tsid)
          })
        }
      },
      next: async ({ action, id, type }) => {
        if (action === DocLogAction.Delete) {
          // If the client becomes disconnected before replication completes, its thoughtspaceDb will be destroyed and needs to be re-loaded to finish processing deletes from the doclog.
          // Just make sure to destroy it on end.
          const thoughtspaceDb = await openThoughtspaceDb(tsid)
          await thoughtspaceDb.clearDocument(
            type === 'thought' ? encodeThoughtDocumentName(tsid, id as ThoughtId) : encodeLexemeDocumentName(tsid, id),
          )
        }
      },

      // persist replication cursor to level db
      storage: {
        getItem: async (key: string) => {
          let results: string | null = null
          try {
            const replicationCursorDb = loadReplicationCursorDb(tsid)
            results = await replicationCursorDb.get(encodeDocLogDocumentName(tsid, key))
          } catch (e: any) {
            // If a value does not exist for the key, return null.
            // Otherwise, throw the error.
            if (e.name !== 'NotFoundError') {
              throw e
            }
          }
          return results
        },
        setItem: (key: string, value: string) => {
          const replicationCursorDb = loadReplicationCursorDb(tsid)
          replicationCursorDb.put(encodeDocLogDocumentName(tsid, key), value)
        },
      },
    })
  } else {
    console.error('Unrecognized doc type', type)
  }
}

// persist permissions to DB_PERMISSIONS with leveldb
// TODO: encrypt

console.info('Loading permissions...')
const permissionsServerSynced = bindState({ db: ldbPermissions, docName: 'permissions', doc: permissionsServerDoc })

const server = Server.configure({
  port,
  onAuthenticate,
  onListen: async () => {
    // notify pm2 that the app is ready
    process.send?.('ready')
  },
  onLoadDocument,
  onConnect: async ({ documentName }) => {
    // Load the replicationCursor into memory in preparation for the replicationController.
    const { tsid, type } = parseDocumentName(documentName)
    if (type === 'doclog') {
      loadReplicationCursorDb(tsid)
    }
  },
  onDisconnect: async ({ documentName }) => {
    // for some reason documentName can be empty (bug?)
    if (!documentName) return

    // unload resources for this thoughtspace when the doclog disconnects
    const { tsid, type } = parseDocumentName(documentName)
    if (type === 'doclog') {
      // Wait for all updates to be stored in the db.
      // Otherwise, the taskQueue will not yet have the storeUpdate promises.
      const storeUpdateQueue = storeUpdateTaskQueues.get(tsid)
      storeUpdateTaskQueues.delete(tsid)

      // this shouldn't be necessary since all updates have been flushed, but it might mitigate the issue
      await sleep(THROTTLE_STOREUPDATE)

      if (storeUpdateQueue && storeUpdateQueue.running() > 0) {
        await storeUpdateQueue.once('end')

        // if the client has reconnected before the storeUpdateQueue finished, abort the disconnect
        if (storeUpdateTaskQueues.has(tsid)) return
      }

      const thoughtspaceDb = ldbThoughtspaces.get(tsid)
      if (thoughtspaceDb) {
        const destroyed = thoughtspaceDb.destroy()
        ldbThoughtspacesReady.set(tsid, destroyed)
        ldbThoughtspaces.delete(tsid)
        destroyed.finally(() => {
          ldbThoughtspacesReady.delete(tsid)
        })
      }

      // unload doclogDb
      const doclogDb = ldbDoclogs.get(tsid)
      if (doclogDb) {
        const destroyed = doclogDb.destroy()
        ldbDoclogs.delete(tsid)
        destroyed.finally(() => {
          ldbDoclogsReady.delete(tsid)
        })
      }

      // unload replicationCursorDb
      unloadReplicationCursorDb(tsid)
    }
  },
})

// gracefully exist for pm2 reload
// not that it matters... level has a lock on the db that prevents zero-downtime reload
process.on('SIGINT', function () {
  ldbThoughtspaces.forEach(db => {
    db.destroy()
  })
  ldbDoclogs.forEach(db => {
    db.destroy()
  })
  ldbReplicationCursors.forEach(db => {
    db.close()
  })
})

// do not start server until permissions have synced
// otherwise owners could get overwritten
permissionsServerSynced.then(() => {
  console.info('Permissions loaded')
  server.listen()
})
