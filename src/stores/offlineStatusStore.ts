import OfflineStatus from '../@types/OfflineStatus'
import WebsocketStatus from '../@types/WebsocketStatus'
import { WEBSOCKET_CONNECTION_TIME } from '../constants'
import { websocketPermissions } from '../data-providers/yjs'
import { rootSynced } from '../data-providers/yjs/thoughtspace'
import ministore from './ministore'

/** A store that tracks a derived websocket connection status that includes special statuses for initialization (preconnecting), the first connection attempt (connecting), and offline mode (offline). See: OfflineStatus. */
export const offlineStatusStore = ministore<OfflineStatus>(
  websocketPermissions.status === 'connected' ? 'connected' : 'preconnecting',
)

/* Offline status state machine driven by websocket connection status changes.

  connecting + preconnecting/connecting/offline -> no change
  connecting + connected/synced -> reconnecting
  connected + preconnecting -> preconnecting
    Stay preconnecting when the provider is connected but not yet synced, otherwise the loading indicator will flash.
  connected + connecting/connected/offline -> connected
  disconnected -> reconnecting

*/
websocketPermissions.on('status', ({ status }: { status: WebsocketStatus }) => {
  offlineStatusStore.update(statusOld =>
    status === 'connecting'
      ? statusOld === 'preconnecting' || statusOld === 'connecting' || statusOld === 'offline'
        ? statusOld
        : 'reconnecting'
      : status === 'connected'
      ? (stopConnecting(), 'connected')
      : status === 'disconnected'
      ? (startConnecting(), 'reconnecting')
      : (new Error('Unknown connection status: ' + status), statusOld),
  )
})

// If the websocket is still connecting for the first time when IDB is synced and non-empty, change the status to reconnecting to dismiss "Connecting..." and render the available thoughts. See: NoThoughts.tsx.
rootSynced.then(rootThought => {
  if (Object.keys(rootThought.childrenMap || {}).length > 0) {
    offlineStatusStore.update(statusOld =>
      statusOld === 'preconnecting' || statusOld === 'connecting' ? 'reconnecting' : statusOld,
    )
  }
})

/** Enter a connecting state and then switch to offline after a delay. */
const startConnecting = () => {
  stopConnecting()
  // Unless this is a new user, IndexedDB probably already loaded the root thoughts and set the status to synced
  offlineStatusStore.update(statusOld =>
    statusOld !== 'synced' && statusOld !== 'reconnecting' ? 'connecting' : statusOld,
  )
  offlineTimer = setTimeout(() => {
    offlineTimer = null
    offlineStatusStore.update('offline')
  }, WEBSOCKET_CONNECTION_TIME)
}

/** Clears the timer, indicating either that we have connected to the websocket server, or have entered offline mode as the client continues connecting in the background. */
const stopConnecting = () => {
  clearTimeout(offlineTimer!)
  offlineTimer = null
}

let offlineTimer: ReturnType<typeof setTimeout> | null = null

/** Initializes the yjs data provider. */
export const init = () => {
  // Start connecting to populate offlineStatusStore.
  // This must done in an init function that is called in app initalize, otherwise @sinonjs/fake-timers are not yet set and createTestApp tests break.
  // TODO: Why does deferring websocketProviderPermissions.connect() to init break tests?
  offlineTimer = setTimeout(startConnecting, 500)
}

export default offlineStatusStore
