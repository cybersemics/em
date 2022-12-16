import { nanoid } from 'nanoid'
import { WebsocketProvider } from 'y-websocket-auth'
import * as Y from 'yjs'

const server = require('y-websocket-auth/server')
const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 1234
const permissionsDir = process.env.YPERSISTENCE || './.permissions.level'
const serverId = nanoid()

/**
 * Per-document permissions. Persisted to PERMISSIONS_DIR (default: .permissions.level)
 *
 * @example
 *   {
 *     [docid]: {
 *       [accessToken]: [role]
 *     }
 *   }
 */
const ydoc = new Y.Doc()
// const PERMISSIONS_DOCID = 'permissions'
// const LeveldbPersistence = require('y-leveldb').LeveldbPersistence
// const ldb = new LeveldbPersistence(permissionsDir)
// ;(async () => {
//   const persistedYdoc = await ldb.getYDoc(PERMISSIONS_DOCID)
//   const newUpdates = Y.encodeStateAsUpdate(ydoc)
//   ldb.storeUpdate(PERMISSIONS_DOCID, newUpdates)
//   Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc))
//   ydoc.on('update', update => {
//     ldb.storeUpdate(PERMISSIONS_DOCID, update)
//   })
// })()

/** Authenticates the access token. */
export const authenticate = (accessToken: string, docid: string, json: any) => {
  if (accessToken === serverId) return true
  console.log('authenticate', { accessToken, docid, json })
  const permissionsDocId = docid.endsWith('/permissions') ? docid.split('/permissions')[0] : null
  const yPermissions = ydoc.getMap<string>('permissions')
  const role = yPermissions.get(accessToken)
  console.log({ role })

  // if the document has no owner, automatically assign the current user as owner
  if (!permissionsDocId && !role) {
    console.info('assigning owner')
    yPermissions.set(accessToken, 'owner')
    return true
  }

  return role === 'owner'
}

const permissionsProvider = new WebsocketProvider('ws://localhost:1234', 'mlWuPseluUoRm_0WDkj_D/permissions', ydoc, {
  auth: serverId,
  WebSocketPolyfill: require('ws'),
})
permissionsProvider.on('status', (event: any) => {
  console.info('websocket', event.status) // logs "connected" or "disconnected"
})

server({ authenticate }).listen(port, host, () => {
  console.info(`server running at '${host}' on port ${port}`)
})
