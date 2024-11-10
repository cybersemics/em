import OfflineStatus from '../@types/OfflineStatus'
import { WEBSOCKET_TIMEOUT } from '../constants'
import reactMinistore from './react-ministore'

/** A store that tracks a derived websocket connection status that includes special statuses for initialization (preconnecting), the first connection attempt (connecting), and offline mode (offline). There are a couple places where offlineStatusStore.update is called directly in order to skip preconnecting. See: OfflineStatus type for description of all possible statuses. */
export const offlineStatusStore = reactMinistore<OfflineStatus>('preconnecting')

/** Delay before attempting to connect to the server. Disabled during E2E tests. */
const preconnectingTimeout = navigator.webdriver ? 0 : 500

/** Amount of time trying to connect before changint to offline status. Disabled during E2E tests. */
const offlineTimeout = navigator.webdriver ? 0 : WEBSOCKET_TIMEOUT

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
  }, offlineTimeout)
}

/** Clears the timer, indicating either that we have connected to the websocket server, or have entered offline mode as the client continues connecting in the background. */
const stopConnecting = () => {
  clearTimeout(offlineTimer!)
  offlineTimer = null
}

let offlineTimer: ReturnType<typeof setTimeout> | null = null

/** Initializes the yjs data provider. */
export const init = () => {
  // if (websocket.status === 'connected') {
  //   offlineStatusStore.update('connected')
  // }

  /* Offline status state machine driven by websocket connection status changes.

  connecting + preconnecting/connecting/offline -> no change
  connecting + connected/synced -> reconnecting
  connected + preconnecting -> preconnecting
    Stay preconnecting when the provider is connected but not yet synced, otherwise the loading indicator will flash.
  connected + connecting/connected/offline -> connected
  disconnected -> reconnecting

*/
  // websocket.on('status', ({ status }: { status: WebsocketStatus }) => {
  //   offlineStatusStore.update(statusOld =>
  //     status === 'connecting'
  //       ? statusOld === 'preconnecting' || statusOld === 'connecting' || statusOld === 'offline'
  //         ? statusOld
  //         : 'reconnecting'
  //       : status === 'connected'
  //         ? (stopConnecting(), 'connected')
  //         : status === 'disconnected'
  //           ? (startConnecting(), 'reconnecting')
  //           : (new Error('Unknown connection status: ' + status), statusOld),
  //   )
  // })

  // Start connecting to populate offlineStatusStore.
  // This must done in an init function that is called in app initalize, otherwise @sinonjs/fake-timers are not yet set and createTestApp tests break.
  // TODO: Why does deferring websocketProviderPermissions.connect() to init break tests?
  offlineTimer = setTimeout(startConnecting, preconnectingTimeout)
}

export default offlineStatusStore
