import { WebsocketProvider } from 'y-websocket-auth'
import * as Y from 'yjs'

const { getYDoc, createServer } = require('y-websocket-auth/server')

const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 1234
const PERMISSIONS_DOCID = 'permissions'

/**
 * All thoughtspace permissions. Mirrors Websocket documents at DOCID/permissions. Must be loaded into memory so that permissions are available for authentication.
 *
 * Persisted to YPERMISSIONS (default: .permissions.level).
 *
 * @example
 *   {
 *     [docid]: {
 *       [accessToken]: [role]
 *     }
 *   }
 */
const ydoc = new Y.Doc()
if (process.env.YPERMISSIONS) {
  const LeveldbPersistence = require('y-leveldb').LeveldbPersistence
  // do not use process.env.YPERSISTENCE or it will overwrite the thoughtspace leveldb
  const ldb = new LeveldbPersistence(process.env.YPERMISSIONS)
  ;(async () => {
    const persistedYdoc = await ldb.getYDoc(PERMISSIONS_DOCID)
    const newUpdates = Y.encodeStateAsUpdate(ydoc)
    ldb.storeUpdate(PERMISSIONS_DOCID, newUpdates)
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc))
    ydoc.on('update', update => {
      ldb.storeUpdate(PERMISSIONS_DOCID, update)
    })
  })()
}

/** Authenticates the access token. */
export const authenticate = (accessToken: string, { name, params }: { name: string; params: any }) => {
  const docName = name.endsWith('/permissions') ? name.split('/permissions')[0] : name
  const permissionsDocName = `${docName}/permissions`
  const permissionsDoc: Y.Doc = getYDoc(permissionsDocName)
  const yPermissionsServer = ydoc.getMap<string>(docName)
  let role = yPermissionsServer.get(accessToken)

  // if the document has no owner, automatically assign the current user as owner
  if (yPermissionsServer.size === 0) {
    console.info('assigning owner')
    yPermissionsServer.set(accessToken, 'owner')
    role = 'owner'
  }

  // Copy permissions from the server-side permissions doc to the client-side permission doc.
  // The server-side permissions doc keeps all permissions for all documents into memory.
  // The client-side permissions doc uses authentication and can be exposed to the client via websocket.
  if (role === 'owner' && params.type === 'auth') {
    const yPermissionsClient = permissionsDoc.getMap<string>(PERMISSIONS_DOCID)
    yPermissionsServer.forEach((value, key) => {
      yPermissionsClient.set(key, value)
    })
  }

  return role === 'owner'
}

const routes: { [key: string]: (...props: any) => any } = {
  share: ({ docid, accessToken }: { docid: string; accessToken: string }) => {
    const permissionsDoc: Y.Doc = getYDoc(docid)
    const yPermissionsServer = ydoc.getMap<string>(docid)
    const yPermissionsClient = permissionsDoc.getMap<string>(PERMISSIONS_DOCID)
    yPermissionsServer.set(accessToken, 'owner')
    yPermissionsClient.set(accessToken, 'owner')
  },
}

createServer({ authenticate, routes }).listen(port, host, () => {
  console.info(`server running at '${host}' on port ${port}`)
})
