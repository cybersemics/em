import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider'
import { nanoid } from 'nanoid'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import Share from '../../@types/Share'
import storage from '../../util/storage'
import { encodePermissionsDocumentName } from './documentNameEncoder'

const host = import.meta.env.VITE_WEBSOCKET_HOST || 'localhost'
const port = import.meta.env.VITE_WEBSOCKET_PORT || (host === 'localhost' ? 3001 : '')
const protocol = host === 'localhost' ? 'ws' : 'wss'

export const websocketUrl = `${protocol}://${host}${port ? ':' + port : ''}/hocuspocus`

// stores the permissions for the entire thoughtspace as Index<Share> (indexed by access token)
// only accessible by owner
export const permissionsClientDoc = new Y.Doc()

// Define a secret access token for this device.
// Used to authenticate a connection to the y-websocket server.
export const accessTokenLocal = storage.getItem('accessToken', () => nanoid(21))

// Define a unique tsid (thoughtspace id) that is used as the default yjs doc id.
// This can be shared with ?share={docId} when connected to a y-websocket server.
export const tsidLocal = storage.getItem('tsid', () => nanoid(21))

// access a shared document when the URL contains share=DOCID&
// otherwise use the tsid stored on the device
export const tsidShared = new URLSearchParams(window.location.search).get('share')
const accessTokenShared = new URLSearchParams(window.location.search).get('auth')

export const tsid = tsidShared || tsidLocal
export const accessToken = accessTokenShared || accessTokenLocal

/** A public key that is a secure hash of the access token. Not available until clientIDReady resolves. */
export let clientId = ''

/** Encodes binary data in base64. */
async function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  // use a FileReader to generate a base64 data URI:
  const base64url = await new Promise<string>(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(new Blob([buffer]))
  })
  // remove the `data:...;base64,` part from the start
  return base64url.slice(base64url.indexOf(',') + 1)
}

/** Resolves when the clientId is available to use synchronously. */
export const clientIdReady = (
  crypto.subtle
    ? crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken)).then(bufferToBase64)
    : // fall back to nanoid if crypto.subtle is not available
      Promise.resolve(nanoid())
).then(s => {
  clientId = s
  return s
})

// Disable IndexedDB during tests because of TransactionInactiveError in fake-indexeddb.
if (import.meta.env.MODE !== 'test') {
  // eslint-disable-next-line no-new
  new IndexeddbPersistence(encodePermissionsDocumentName(tsid), permissionsClientDoc)
}

// websocket provider
export const websocket = new HocuspocusProviderWebsocket({
  // disable websocket since YJS is being sunset and server is no longer deployed.
  // eslint-disable-next-line no-constant-condition
  connect: false,
  url: websocketUrl,
})
export const websocketProviderPermissions = new HocuspocusProvider({
  // disable awareness for performance
  // doclog doc has awareness enabled to keep the websocket open
  websocketProvider: websocket,
  name: encodePermissionsDocumentName(tsid),
  document: permissionsClientDoc,
  token: accessToken,
})

// TODO: Separate thoughtspace websocket from permissions websocket to allow for connect/disconnect
export const websocketThoughtspace = websocket
// export const websocketThoughtspace = new HocuspocusProviderWebsocket({
//   url: websocketUrl,
//   // Do not auto connect. Connects in connectThoughtspaceProvider only when there is more than one device.
//   connect: false,
// })

// Reconnect on disconnect in order to mitigate a bug in Hocuspocus that causes idle connection timeouts.
// https://github.com/ueberdosis/hocuspocus/issues/566#issuecomment-1582525932
websocketThoughtspace.on('disconnect', () => {
  setTimeout(() => {
    console.warn('Reconnecting websocket')
    websocketThoughtspace.connect()
  })
})

/** If there is more than one device, connects the thoughtspace Websocket provider. */
const connectThoughtspaceProvider = () => {
  if (permissionsClientMap.size > 1) {
    websocketThoughtspace.connect()
  }
}
const permissionsClientMap = permissionsClientDoc.getMap<Share>()
// indexeddbProviderPermissions.whenSynced.then(connectThoughtspaceProvider)
permissionsClientMap.observe(connectThoughtspaceProvider)

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

//       // the welcome modal was disabled in initialState, but we still need to complete it so it doesn't appear again
//       storage.setItem('welcomeComplete')

//       // clear share params from URL without refreshing
//       window.history.pushState({}, '', '/')
//     }, 400)
//   })
// }
