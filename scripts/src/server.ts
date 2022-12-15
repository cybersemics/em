const Y = require('yjs')
const { server } = require('y-websocket-auth')

const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 1234
const permissionsDir = process.env.PERMISSIONS_DIR || './.permissions.level'

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
const docName = 'permissions'
const ydoc = new Y.Doc()
const yPermissions = ydoc.getMap(docName)
const LeveldbPersistence = require('y-leveldb').LeveldbPersistence
const ldb = new LeveldbPersistence(permissionsDir)
;(async () => {
  const persistedYdoc = await ldb.getYDoc('permissions')
  const newUpdates = Y.encodeStateAsUpdate(ydoc)
  ldb.storeUpdate(docName, newUpdates)
  Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc))
  ydoc.on('update', update => {
    ldb.storeUpdate(docName, update)
  })
})()

/** Authenticates the access token. */
const authenticate = (accessToken, docid, { permission } = {}) => {
  const docPermissions = yPermissions.get(docid)
  console.log({ docPermissions })

  // if the document has no owner, automatically assign the current user as owner
  if (!docPermissions) {
    console.log('assigning owner')
    yPermissions.set(docid, {
      [accessToken]: 'owner',
    })
    return true
  }

  return docPermissions[accessToken] === (permission || 'owner')
}

server({ authenticate }).listen(host, port, () => {
  console.log(`running at '${host}' on port ${port}`)
})
