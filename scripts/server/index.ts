import * as Y from 'yjs'
import Role from '../../src/@types/Role'
import Routes from '../../src/@types/Routes'
import Share from '../../src/@types/Share'

const { getYDoc, createServer } = require('y-websocket-auth/server')

const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 8080
const PERMISSIONS_DOCID = 'permissions'

/** Make text gray in the console. */
// can't use chalk because it is an esmodule, and this file needs to be commonjs to import y-websocket-auth/server
const gray = (s: string) => `\x1B[90m${s}\x1b[0m`

/** Shows the first n characters of a string and replaces the rest with an ellipsis. */
const mask = (s: string, n = 4, ellipsis = '...') => `${s.slice(0, n)}${ellipsis}`

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

/** Logs a message to the console with an optional ISO timestamp. */
const log = (...args: any) => {
  // default to console.info
  // override the method by passing { method: 'error' } as the last argument
  let method = 'info'
  const lastArg = args[args.length - 1]
  if (typeof lastArg === 'object' && Object.keys(lastArg).length === 1 && lastArg.method) {
    args = args.slice(0, -1)
    method = lastArg.method
  }
  if (process.env.LOG_TIMESTAMPS) {
    ;(console as any)[method](gray(new Date().toISOString()), ...args)
  } else {
    ;(console as any)[method](...args)
  }
}

/** Logs an error to the console with an ISO timestamp. */
const logError = (...args: any) => log(...args, { method: 'error' })

/** Authenticates the access token. */
export const authenticate = (accessToken: string, { name, params }: { name: string; params: any }) => {
  const tsid = name.endsWith('/permissions') ? name.split('/permissions')[0] : name
  const permissionsDocName = `${tsid}/permissions`
  const permissionsDoc: Y.Doc = getYDoc(permissionsDocName)
  const yPermissionsServer = ydoc.getMap<Share>(tsid)
  let share = yPermissionsServer.get(accessToken)

  // if the document has no owner, automatically assign the current user as owner
  if (yPermissionsServer.size === 0) {
    log(`assigning owner ${mask(accessToken)} to new thoughtspace ${tsid}`)
    share = { accessed: new Date().toISOString(), created: new Date().toISOString(), name: 'Owner', role: 'owner' }
    yPermissionsServer.set(accessToken, share)
  }

  // Copy permissions from the server-side permissions doc to the client-side permission doc.
  // The server-side permissions doc keeps all permissions for all documents into memory.
  // The client-side permissions doc uses authentication and can be exposed to the client via websocket.
  if (share?.role === 'owner' && params.type === 'auth') {
    // update last accessed time on auth
    yPermissionsServer.set(accessToken, { ...share, accessed: new Date().toISOString() })
    const yPermissionsClient = permissionsDoc.getMap<Share>(PERMISSIONS_DOCID)
    yPermissionsServer.forEach((share: Share, accessToken: string) => {
      yPermissionsClient.set(accessToken, share)
    })
  }

  return share?.role === 'owner'
}

type ServerRoutes = {
  [key in `share/${keyof Routes['share']}`]: (props: any) => any
}

const routes: ServerRoutes = {
  'share/add': ({
    auth,
    accessToken,
    docid,
    name,
    role,
  }: {
    auth: string
    accessToken: string
    docid: string
    name?: string
    role: Role
  }) => {
    log('share/add', { tsid: docid, accessToken: mask(accessToken) })
    const shareNew: Share = { created: new Date().toISOString(), name, role }
    const permissionsDocName = `${docid}/permissions`
    const permissionsDoc: Y.Doc = getYDoc(permissionsDocName)
    const yPermissionsServer = ydoc.getMap<Share>(docid)
    const yPermissionsClient = permissionsDoc.getMap<Share>(PERMISSIONS_DOCID)
    const share = yPermissionsServer.get(auth)
    if (!share) {
      logError('Error: Permissions no longer exist', { docid, accessToken })
      logError({ server: yPermissionsServer.toJSON(), client: yPermissionsClient.toJSON() })
      return {
        error: `Thoughtspace no longer exists: ${accessToken}`,
      }
    }
    yPermissionsServer.set(accessToken, shareNew)
    yPermissionsClient.set(accessToken, shareNew)
  },
  'share/delete': ({ accessToken, docid }) => {
    log('share/delete', { tsid: docid })
    const permissionsDocName = `${docid}/permissions`
    const permissionsDoc: Y.Doc = getYDoc(permissionsDocName)
    const yPermissionsServer = ydoc.getMap<Share>(docid)
    const yPermissionsClient = permissionsDoc.getMap<Share>(PERMISSIONS_DOCID)
    yPermissionsServer.delete(accessToken)
    yPermissionsClient.delete(accessToken)
  },
  'share/update': ({ accessToken, docid, name, role }) => {
    log('share/add', { tsid: docid, accessToken: mask(accessToken), name, role })
    const permissionsDocName = `${docid}/permissions`
    const permissionsDoc: Y.Doc = getYDoc(permissionsDocName)
    const yPermissionsServer = ydoc.getMap<Share>(docid)
    const yPermissionsClient = permissionsDoc.getMap<Share>(PERMISSIONS_DOCID)
    const share = yPermissionsServer.get(accessToken)
    if (!share) {
      logError('Error: Permissions no longer exist', { docid, accessToken })
      logError({ server: yPermissionsServer.toJSON(), client: yPermissionsClient.toJSON() })
      return {
        error: `Thoughtspace no longer exists: ${accessToken}`,
      }
    }
    const shareNew = { ...share, name, role }
    yPermissionsServer.set(accessToken, shareNew)
    yPermissionsClient.set(accessToken, shareNew)
  },
}

createServer({ authenticate, routes }).listen(port, host, () => {
  console.info('')
  log(`server running at '${host}' on port ${port}`)
})
