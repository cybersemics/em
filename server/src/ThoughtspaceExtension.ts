import { Extension, onAuthenticatePayload, onLoadDocumentPayload } from '@hocuspocus/server'
import { isEqual, throttle } from 'lodash'
import { MongodbPersistence } from 'y-mongodb-provider'
import * as Y from 'yjs'
import DocLogAction from '../../src/@types/DocLogAction'
import Index from '../../src/@types/IndexType'
import ReplicationCursor from '../../src/@types/ReplicationCursor'
import Share from '../../src/@types/Share'
import ThoughtId from '../../src/@types/ThoughtId'
import {
  encodeLexemeDocumentName,
  encodePermissionsDocumentName,
  encodeThoughtDocumentName,
  parseDocumentName,
} from '../../src/data-providers/yjs/documentNameEncoder'
import replicationController from '../../src/data-providers/yjs/replicationController'
import sleep from '../../src/util/sleep'
import throttleConcat from '../../src/util/throttleConcat'
import timestamp from '../../src/util/timestamp'
import observe from './metrics'

/**********************************************************************
 * Constants
 **********************************************************************/

/** Number of milliseconds to throttle db.storeUpdate on Doc update. */
const THROTTLE_STOREUPDATE = 1000

/** Frequency of lastAccessed update on permissions doc. */
const THROTTLE_LAST_ACCESSED = 1000

/**********************************************************************
 * Types
 **********************************************************************/

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error'

/** Custom data that is passed from onAuthenticate to onLoadDocument. */
interface LoadContext {
  token: string
}

/** A YJS data store that can store updates. */
export interface YBindablePersistence {
  getYDoc: (docName: string) => Promise<Y.Doc>
  storeUpdate: (docName: string, update: Uint8Array) => Promise<unknown>
}

/**********************************************************************
 * Helper Functions
 **********************************************************************/

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

/** Shows the first n characters of a string and replaces the rest with an ellipsis. */
const mask = (s: string, n = 4) => `${s.slice(0, n)}...`

/** Syncs a doc with leveldb and subscribes to updates (throttled). Resolves when the initial state is stored. Returns a cleanup function that should be called to ensure throttled updates gets flushed to leveldb. */
// Note: @hocuspocus/extension-database is not incremental; all data is re-saved every debounced 2 sec, so we do our own throttled storage with throttleConcat.
// https://tiptap.dev/hocuspocus/server/extensions#database
const bindState = async ({
  db,
  docName,
  doc,
}: {
  db: YBindablePersistence
  docName: string
  doc: Y.Doc
}): Promise<void> => {
  const { tsid, type } = parseDocumentName(docName)

  const docPersisted = await db.getYDoc(docName)
  const stateVectorPersisted = Y.encodeStateVector(docPersisted)

  // store any state that has not been persisted
  const updateDiff = Y.encodeStateAsUpdate(doc, stateVectorPersisted)
  if (updateDiff.length > 2) {
    // TODO: Do we need await? db.getYDoc has already succeeded, so it seems that storing the update from the client can happen in the background.
    await db.storeUpdate(docName, updateDiff).catch(e => {
      console.error('bindState: initial storeUpdate error', e)
    })
  }

  Y.applyUpdate(doc, Y.encodeStateAsUpdate(docPersisted))

  // clean up persisted doc once it has been loaded and applied to the server
  docPersisted.destroy()

  // throttled update handler accumulates and merges updates
  const storeUpdateThrottled = throttleConcat(
    // Note: Is it a problem that mergeUpdates does not perform garbage collection?
    // https://discuss.yjs.dev/t/throttling-yjs-updates-with-garbage-collection/1423
    (updates: Uint8Array[]) => {
      const t = performance.now()
      return updates.length > 0
        ? db
            .storeUpdate(docName, Y.mergeUpdates(updates))
            .then(() => {
              observe({
                name: 'em.server.save',
                value: performance.now() - t,
                tags: { tsid, type },
              })
            })
            .catch((e: any) => {
              console.error('bindState: storeUpdate error', e)
            })
        : null
    },
    THROTTLE_STOREUPDATE,
  )

  doc.on('update', storeUpdateThrottled)
}

/**********************************************************************
 * Hooks
 **********************************************************************/

/** Authenticates a document request with the given access token. Handles Docs for Thoughts, Lexemes, and Permissions. Assigns the token as owner if it is a new document. Throws an error if the access token is not authorized. */
const onAuthenticate =
  (permissionsServerDocPromise: Promise<Y.Doc>) =>
  async ({ documentName, token }: onAuthenticatePayload): Promise<LoadContext> => {
    const permissionsServerDoc = await permissionsServerDocPromise
    const { tsid } = parseDocumentName(documentName)
    // the server-side permissions map
    // stores the permissions for all thoughtspaces as Map<Index<Share>> (indexed by tsid and access token)
    // only accessible on the server
    const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)

    // if the document has no owner, automatically assign the current user as owner
    if (permissionsServerMap.size === 0) {
      log(`assigning owner ${mask(token)} to new thoughtspace ${tsid}`)
      permissionsServerMap.set(token, { created: timestamp(), name: 'Owner', role: 'owner' })
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
const onLoadDocument = (configuration: {
  dbPermissions: MongodbPersistence
  dbThoughtspace: MongodbPersistence
  dbDoclog: MongodbPersistence
  /** A promise for the server-side permissinos doc. */
  permissionsServerDoc: Promise<Y.Doc>
}) => {
  // create throttled function to update last accessed time
  const setLastAccessed = throttle(async (tsid: string) => {
    configuration.dbPermissions.setMeta(tsid, 'lastAccessed', timestamp())
  }, THROTTLE_LAST_ACCESSED)

  return async ({
    context,
    document,
    documentName,
    instance,
  }: onLoadDocumentPayload & {
    context: LoadContext
  }) => {
    const permissionsServerDoc = await configuration.permissionsServerDoc
    const { dbThoughtspace, dbDoclog } = configuration
    const { token } = context
    const { tsid, type } = parseDocumentName(documentName)
    const permissionsDocName = encodePermissionsDocumentName(tsid)
    const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)
    const permission = permissionsServerMap.get(token)

    if (!permission || permission.role !== 'owner') return

    setLastAccessed(tsid)

    const t = performance.now()

    // Load client-side permissions.
    // Copy permissions from the server-side permissions doc to the client-side permission doc.
    // The server-side permissions doc keeps all permissions for all documents in memory.
    // The client-side permissions doc uses authentication and can be exposed to the client via websocket once authenticated.
    if (type === 'permissions') {
      const permissionsClientDoc = instance?.documents.get(permissionsDocName)
      if (!permissionsClientDoc) return

      const permissionsClientMap = permissionsClientDoc.getMap<Share>()

      // copy server permissions to client
      permissionsServerMap.forEach((permission: Share, token: string) => {
        // Only set permissions if they are different from the server.
        // Otherwise it results in duplicate updates to the Doc.
        if (!isEqual(permissionsClientMap.get(token), permission)) {
          permissionsClientMap.set(token, permission)
        }
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

            // if name or role have changed, update the permissions server
            if (clientShare.name !== serverShare?.name || clientShare.role !== serverShare?.role) {
              permissionsServerMap.set(key, clientShare)
            }
          }
        })
      })
    } else if (type === 'thought' || type === 'lexeme') {
      await bindState({ db: dbThoughtspace, docName: documentName, doc: document })
    } else if (type === 'doclog') {
      await bindState({ db: dbDoclog, docName: documentName, doc: document })

      // Use a replicationController to track thought and lexeme deletes in the doclog.
      // Clears persisted documents that have been deleted, even if the client disconnects.
      // Note: It is recommended to clear all contexts from a Lexeme before deleting it to mitigate re-entry bugs if a new Lexeme with the same key is created quickly after a delete.
      replicationController({
        doc: document,
        next: async ({ action, id, type }) => {
          if (action === DocLogAction.Delete) {
            await dbThoughtspace.clearDocument(
              type === 'thought'
                ? encodeThoughtDocumentName(tsid, id as ThoughtId)
                : encodeLexemeDocumentName(tsid, id),
            )
          }
        },

        // persist replication cursor to level db
        storage: {
          getItem: async (key: string): Promise<Index<ReplicationCursor>> => {
            const replicationCursorKey = `${tsid}-${key}`
            let replicationCursors: Index<ReplicationCursor> = {}
            try {
              replicationCursors = (await dbThoughtspace.getMeta(documentName, replicationCursorKey)) || {}
            } catch (e: any) {
              // If a value does not exist for the key, return an empty object.
              // Otherwise, throw the error.
              if (e.name !== 'NotFoundError') {
                throw e
              }
            }
            // backwards compatibility for when replicationCursorDb stored a single ReplicationCursor instead of a ReplicationCursor for each block
            // TODO: This can be removed after setItem is called once with the new schema.
            return replicationCursors
          },
          setItem: (key: string, value: Index<ReplicationCursor>) => {
            const replicationCursorKey = `${tsid}-${key}`
            dbThoughtspace.setMeta(documentName, replicationCursorKey, value)
          },
        },
      })
    } else {
      console.error('Unrecognized doc type', type)
    }

    // only log load metrics for thought, lexeme, and doclogs
    // permissions are already loaded and do not block onLoadDocument
    if (type !== 'permissions') {
      observe({
        name: 'em.server.load',
        value: performance.now() - t,
        tags: { tsid, type },
      })
    }
  }
}

/**********************************************************************
 * Extension
 **********************************************************************/

/** A Hocuspocus server extension that persists em thoughtspaces and handles permissions. */
class ThoughtspaceExtension implements Extension {
  onAuthenticate: (data: onAuthenticatePayload) => Promise<unknown>
  onLoadDocument: (data: onLoadDocumentPayload) => Promise<unknown>

  constructor({ connectionString }: { connectionString: string }) {
    const t = performance.now()

    const dbPermissions = new MongodbPersistence(connectionString, { collectionName: 'yjs-permissions' })
    const dbThoughtspace = new MongodbPersistence(connectionString, { collectionName: 'yjs-thoughtspace' })
    const dbDoclog = new MongodbPersistence(connectionString, { collectionName: 'yjs-doclogs' })

    // Load the server-side permissions
    // Contains a top level map for each thoughtspace Map<Share> mapping token -> permission.
    // Wait a tick before logging to ensure the "Loading permissions..." message is not lost in the noise of the server startup.
    const permissionsServerDoc = sleep(0).then(async () => {
      console.info('Loading permissions...')
      const doc = new Y.Doc()
      await bindState({
        db: dbPermissions,
        docName: 'permissions',
        doc: doc,
      })
      console.info('Permissions loaded')
      observe({
        name: 'em.server.permissions',
        value: performance.now() - t,
      })
      return doc
    })

    this.onAuthenticate = onAuthenticate(permissionsServerDoc)
    this.onLoadDocument = onLoadDocument({
      dbPermissions,
      dbThoughtspace,
      dbDoclog,
      // Pass the permissions doc to onAuthenticate so it can be used to authenticate the connection.
      // It will also ensure that no connections are authenticated before the server permissions are loaded.
      // Otherwise owners could be overwritten with the auto-assign owner logic.
      permissionsServerDoc,
    })
  }
}

export default ThoughtspaceExtension
