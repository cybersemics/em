import OfflineStatus from '../@types/OfflineStatus'
import ThoughtDb from '../@types/ThoughtDb'
import WebsocketStatus from '../@types/WebsocketStatus'
import { HOME_TOKEN, WEBSOCKET_CONNECTION_TIME } from '../constants'
import {
  indexeddbProviderThoughtspace,
  websocketProviderPermissions,
  websocketProviderThoughtspace,
  ydoc,
} from '../data-providers/yjs'
import ministore from './ministore'

/** A store that tracks a derived websocket connection status that includes special statuses for initialization (preconnecting), the first connection attempt (connecting), and offline mode (offline). See: OfflineStatus. */
export const offlineStatusStore = ministore<OfflineStatus>(
  websocketProviderPermissions.wsconnected ? 'connected' : 'preconnecting',
)

websocketProviderPermissions.on('status', (e: { status: WebsocketStatus }) => {
  offlineStatusStore.update(statusOld =>
    e.status === 'connecting'
      ? // preconnecting/connecting/offline (no change)
        statusOld === 'preconnecting' || statusOld === 'connecting' || statusOld === 'offline'
        ? statusOld
        : 'reconnecting'
      : // connected (stop reconnecting)
      e.status === 'connected'
      ? // Stay preconnecting when the provider becomes connected and wait for synced.
        // Otherwise the loading indicator will flash.
        (stopConnecting(), statusOld === 'preconnecting' ? 'preconnecting' : 'connected')
      : // disconnecting (start reconnecting)
      e.status === 'disconnected'
      ? (startConnecting(), 'reconnecting')
      : (new Error('Unknown connection status: ' + e.status), statusOld),
  )
})
websocketProviderThoughtspace.on('synced', () => {
  stopConnecting()
  offlineStatusStore.update('synced')
})

/** Enter a connecting state and then switch to offline after a delay. */
const startConnecting = () => {
  stopConnecting()
  offlineStatusStore.update('connecting')
  offlineTimer = setTimeout(() => {
    offlineTimer = null
    offlineStatusStore.update('offline')
  }, WEBSOCKET_CONNECTION_TIME)
}

/** Clears the preconnecting and offline timers, indicating either that we have connected to the websocket server, or have entered offline mode as the client continues connecting in the background. */
const stopConnecting = () => {
  clearTimeout(offlineTimer!)
  offlineTimer = null
}

// set status to synced when the thoughtspace loads if the root is not empty
indexeddbProviderThoughtspace.whenSynced.then(() => {
  const yThoughtIndex = ydoc.getMap<ThoughtDb>('thoughtIndex')
  if (Object.keys(yThoughtIndex.get(HOME_TOKEN)?.childrenMap || {}).length > 0) {
    offlineStatusStore.update('synced')
  }
})

let offlineTimer: ReturnType<typeof setTimeout> | null = null

/** Initializes the yjs data provider. */
export const init = () => {
  // Start connecting to populate offlineStatusStore.
  // This must done in an init function that is called in app initalize, otherwise @sinonjs/fake-timers are not yet set and createTestApp tests break.
  // TODO: Why does deferring websocketProviderPermissions.connect() to init break tests?
  offlineTimer = setTimeout(() => startConnecting(), 500)
}

export default offlineStatusStore
