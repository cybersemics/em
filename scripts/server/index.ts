import { Server } from '@hocuspocus/server'
import { LeveldbPersistence } from 'y-leveldb'
import * as Y from 'yjs'
import Index from '../../src/@types/IndexType'
import Share from '../../src/@types/Share'
import { encodePermissionsDocumentName, parseDocumentName } from '../../src/data-providers/yjs/documentNameEncoder'

const host = process.env.HOST || 'localhost'
const port = process.env.PORT ? +process.env.PORT : 8080
const PERMISSIONS_DOC_NAME = 'permissions'

// contains a top level map for each thoughtspace Map<Share> mapping token -> permission
const permissionsServerDoc = new Y.Doc()

/** Shows the first n characters of a string and replaces the rest with an ellipsis. */
const mask = (s: string, n = 4) => `${s.slice(0, n)}...`

/** Gets a permissionsServerDoc by name that is synced by the server. */
const getYDoc = (name: string): Y.Doc | undefined => server.documents.get(name)

/** Make text gray in the console. */
const gray = (s: string) => `\x1B[90m${s}\x1b[0m`

/** Logs a message to the console with an ISO timestamp. */
const log = (...args: any) => {
  // prepend timestamp
  if (process.env.LOG_TIMESTAMPS) {
    args = [gray(new Date().toISOString()), ...args]
  }
  // default to console.info
  // override the method by passing { method: 'error' } as the last argument
  let method = 'info'
  const lastArg = args[args.length - 1]
  if (typeof lastArg === 'object' && Object.keys(lastArg).length === 1 && lastArg.method) {
    args = args.slice(0, -1)
    method = lastArg.method
  }
  ;(console as any)[method](...args)
}

/** Authenticates a document request with the given access token. Handles Docs for Thoughts, Lexemes, and Permissions. Assigns the token as owner if it is a new document. Throws an error if the access token is not authorized. */
export const onAuthenticate = async ({ token, documentName }: { documentName: string; token: string }) => {
  const tsid = parseDocumentName(documentName)
  const permissionsDocName = encodePermissionsDocumentName(tsid)
  // the server-side permissions map
  // stores the permissions for all thoughtspaces as Map<Index<Share>> (indexed by tsid and access token)
  // only accessible on the server
  const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)

  // if the document has no owner, automatically assign the current user as owner
  if (permissionsServerMap.size === 0) {
    log(`assigning owner ${mask(token)} to new thoughtspace ${tsid}`)
    permissionsServerMap.set(token, { accessed: Date.now(), created: Date.now(), name: 'Owner', role: 'owner' })
  }

  // authenicate existing owner
  // authenticate new documents
  if (permissionsServerMap.get(token)?.role !== 'owner') {
    throw new Error('Not authorized')
  }

  // passed forward as data.context to later hooks
  return { token }
}

/** Syncs permissions to permissionsClientDoc on load. permissionsServerDoc cannot be exposed since it contains permissions for all thoughtspaces. This must be done in onLoadDocument when permissionsClientDoc has been created through the websocket connection. */
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
  const tsid = parseDocumentName(documentName)
  const permissionsDocName = encodePermissionsDocumentName(tsid)
  const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)
  let permission = permissionsServerMap.get(token)
  const permissionsClientDoc = getYDoc(documentName)

  // Copy permissions from the server-side permissions doc to the client-side permission doc.
  // The server-side permissions doc keeps all permissions for all documents in memory.
  // The client-side permissions doc uses authentication and can be exposed to the client via websocket.
  if (permission?.role === 'owner') {
    // update last accessed time on auth
    permissionsServerMap.set(token, { ...permission, accessed: Date.now() })

    const permissionsClientDoc = getYDoc(permissionsDocName)
    if (!permissionsClientDoc) return

    const permissionsClientMap = permissionsClientDoc.getMap<Share>()

    // sync client permissions to server
    // TODO: Maybe we can 2-way sync only the updates for this tsid
    permissionsClientMap?.observe(e => {
      e.changes.keys.forEach((change, key) => {
        if (change.action === 'delete') {
          permissionsServerMap.delete(key)
        } else {
          permissionsServerMap.set(key, permissionsClientMap.get(key)!)
        }
      })
    })

    // copy server permissions to client
    permissionsServerMap.forEach((permission: Share, token: string) => {
      permissionsClientMap.set(token, permission)
    })
  }
}

// persist permissions to YPERMISSIONS with leveldb
// TODO: encrypt
if (process.env.YPERMISSIONS) {
  // do not use process.env.YPERSISTENCE or it will overwrite the thoughtspace leveldb
  const ldb = new LeveldbPersistence(process.env.YPERMISSIONS)
  ;(async () => {
    const persistedYdoc = await ldb.getYDoc(PERMISSIONS_DOC_NAME)
    const newUpdates = Y.encodeStateAsUpdate(permissionsServerDoc)
    ldb.storeUpdate(PERMISSIONS_DOC_NAME, newUpdates)
    Y.applyUpdate(permissionsServerDoc, Y.encodeStateAsUpdate(persistedYdoc))
    permissionsServerDoc.on('update', update => {
      ldb.storeUpdate(PERMISSIONS_DOC_NAME, update)
    })
  })()
}

const server = Server.configure({
  port,
  onAuthenticate,
  onLoadDocument,
})

server.listen()
