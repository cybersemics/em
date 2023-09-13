import { Extension, onAuthenticatePayload, onLoadDocumentPayload } from '@hocuspocus/server'
import { isEqual } from 'lodash'
import { MongodbPersistence } from 'y-mongodb-provider'
import * as Y from 'yjs'
import DocLogAction from '../src/@types/DocLogAction'
import Index from '../src/@types/IndexType'
import ReplicationCursor from '../src/@types/ReplicationCursor'
import Share from '../src/@types/Share'
import ThoughtId from '../src/@types/ThoughtId'
import {
  encodeLexemeDocumentName,
  encodePermissionsDocumentName,
  encodeThoughtDocumentName,
  parseDocumentName,
} from '../src/data-providers/yjs/documentNameEncoder'
import replicationController from '../src/data-providers/yjs/replicationController'
import timestamp from '../src/util/timestamp'
import bindState from './bindState'

/**********************************************************************
 * Types
 **********************************************************************/

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error'

/** Configuration object for the ThoughtspaceExtension. */
export interface ThoughtspaceConfiguration {
  dbThoughtspace: MongodbPersistence
  dbDoclog: MongodbPersistence
  permissionsServerDoc: Y.Doc
}

/** Custom data that is passed from onAuthenticate to onLoadDocument. */
interface LoadContext {
  token: string
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

/**********************************************************************
 * Hooks
 **********************************************************************/

/** Authenticates a document request with the given access token. Handles Docs for Thoughts, Lexemes, and Permissions. Assigns the token as owner if it is a new document. Throws an error if the access token is not authorized. */
const onAuthenticate =
  (configuration: ThoughtspaceConfiguration) =>
  async ({ documentName, token }: onAuthenticatePayload): Promise<LoadContext> => {
    const { permissionsServerDoc } = configuration
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
const onLoadDocument =
  (configuration: ThoughtspaceConfiguration) =>
  async ({
    context,
    document,
    documentName,
    instance,
  }: onLoadDocumentPayload & {
    context: LoadContext
  }) => {
    const { dbThoughtspace, dbDoclog, permissionsServerDoc } = configuration
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

            // compare name and role
            // do not compare created and accessed, since the server is assumed to be the source of truth
            if (clientShare?.name !== serverShare?.name || clientShare?.role !== serverShare?.role) {
              permissionsServerMap.set(key, permissionsClientMap.get(key)!)
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
  }

/**********************************************************************
 * Extension
 **********************************************************************/

/** A Hocuspocus server extension that persists em thoughtspaces and handles permissions. */
// eslint-disable-next-line fp/no-class
class ThoughtspaceExtension implements Extension {
  onLoadDocument: (data: onLoadDocumentPayload) => Promise<unknown>
  onAuthenticate: (data: onAuthenticatePayload) => Promise<unknown>

  /** Constructor. */
  constructor({ connectionString, permissionsServerDoc }: { connectionString: string; permissionsServerDoc?: Y.Doc }) {
    const configurationMerged = {
      permissionsServerDoc: permissionsServerDoc ?? new Y.Doc(),
      dbThoughtspace: new MongodbPersistence(connectionString, {
        collectionName: 'yjs-thoughtspace',
      }),
      dbDoclog: new MongodbPersistence(connectionString, {
        collectionName: 'yjs-doclogs',
      }),
    }
    this.onLoadDocument = onLoadDocument(configurationMerged)
    this.onAuthenticate = onAuthenticate(configurationMerged)
  }
}

export default ThoughtspaceExtension
