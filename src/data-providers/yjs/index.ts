import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket-auth'
import * as Y from 'yjs'
import Index from '../../@types/IndexType'
import Share from '../../@types/Share'
import WebsocketProviderType from '../../@types/WebsocketProviderType'
import createId from '../../util/createId'
import storage from '../../util/storage'

const host = process.env.REACT_APP_WEBSOCKET_HOST || 'localhost'
const port = process.env.REACT_APP_WEBSOCKET_PORT || 8080
const protocol = host === 'localhost' ? 'ws' : 'wss'
// public host must end with '/' or the websocket connection will not open
export const websocketUrl = `${protocol}://${host}${host === 'localhost' || host.endsWith('/') ? '' : '/'}:${port}`

export const ydoc = new Y.Doc()
export const ypermissionsDoc = new Y.Doc()
export const ydocLocal = new Y.Doc()

// Define a secret access token for this device.
// Used to authenticate a connection to the y-websocket server.
export const accessTokenLocal = storage.getItem('accessToken', createId)

// Define a unique tsid (thoughtspace id) that is used as the default yjs doc id.
// This can be shared with ?share={docId} when connected to a y-websocket server.
export const tsidLocal = storage.getItem('tsid', createId)

// access a shared document when the URL contains share=DOCID&
// otherwise use the tsid stored on the device
const tsidShared = new URLSearchParams(window.location.search).get('share')
const accessTokenShared = new URLSearchParams(window.location.search).get('auth')

export const tsid = tsidShared || tsidLocal
export const accessToken = accessTokenShared || accessTokenLocal

export const indexeddbProviderPermissions = new IndexeddbPersistence(tsid, ypermissionsDoc)
export const indexeddbProviderThoughtspace = new IndexeddbPersistence(tsid, ydoc)

export const websocketProviderPermissions: WebsocketProviderType = new WebsocketProvider(
  websocketUrl,
  `${tsid}/permissions`,
  ypermissionsDoc,
  {
    auth: accessToken,
  },
)

export const websocketProviderThoughtspace = new WebsocketProvider(websocketUrl, tsid, ydoc, {
  auth: accessToken,
  // Do not auto connect. Connects in connectThoughtspaceProvider only when there is more than one device.
  connect: false,
})

/** If there is more than one device, connects the thoughtspace Websocket provider. */
const connectThoughtspaceProvider = () => {
  if (yPermissions.size > 1) {
    websocketProviderThoughtspace.connect()
  }
}
const yPermissions = ypermissionsDoc.getMap<Index<Share>>('permissions')
indexeddbProviderPermissions.whenSynced.then(connectThoughtspaceProvider)
yPermissions.observe(connectThoughtspaceProvider)

// If the local thoughtspace is empty, save the shared docid and accessToken locally, i.e. make them the default thoughtspace.
// if (tsidShared && accessTokenShared && tsidShared !== tsidLocal) {
//   const websocketProviderLocal = new WebsocketProvider(websocketUrl, tsidLocal, ydocLocal, {
//     auth: accessTokenLocal,
//   })
//   websocketProviderLocal.on('synced', (event: any) => {
//     const yThoughtIndexLocal = ydocLocal.getMap<ThoughtDb>('thoughtIndex')

//     // The root thought is not always loaded when synced fires. Maybe it is still propagating?
//     // Delaying helps but does not eliminate the issue.
//     // yThoughtIndexLocal.update will not be called with an empty thoughtspace.
//     // If a false positive occurs, the old thoughtspace will be lost (!!!)
//     // Maybe IndexedDB will help eliminate the possibility of a false positive?
//     setTimeout(() => {
//       const rootThought = yThoughtIndexLocal.get(HOME_TOKEN)
//       const isEmptyThoughtspace = rootThought && Object.keys(rootThought?.childrenMap || {}).length === 0
//       if (!isEmptyThoughtspace) return

//       // save shared access token and tsid as default
//       console.info('Setting shared thoughtspace as default')
//       storage.setItem('accessToken', accessTokenShared)
//       storage.setItem('tsid', tsidShared)

//       // backup tsid and accessToken just in case there is a false positive
//       storage.getItem('tsidBackup', tsidLocal)
//       storage.getItem('accessTokenBackup', accessTokenLocal)

//       // close the welcome modal
//       store.dispatch(modalComplete('welcome'))

//       // clear share params from URL without refreshing
//       window.history.pushState({}, '', '/')
//     }, 400)
//   })
// }
