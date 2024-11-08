/** A store that tracks a derived websocket connection status that includes special statuses for initialization (preconnecting), the first connection attempt (connecting), and offline mode (offline).
 *
 * - preconnecting: Initial value for a very short time before entering "connecting". This is helpful for delaying the loading indicator until it is warranted (i.e. 400-500ms) and avoid an unnecessary flash of the loader.
 * - connecting     Connecting for the first time. Immediately follows preconnecting. Useful to distinguish from reconnecting, which tries to occur in the background with a seamless transition to offline mode.
 * - connected      Connected to the websocket server.
 * - synced         Websocket server has finished syncing thoughts.
 * - reconnecting   If a client becomes disconnected, it will go into reconnecting briefly, and then offline if it cannot re-establish a connection.
 * - offline        Offline mode after failing to connect to the websocket server. The status will stay offline until/if it becomes connected.
 *
 * */
type OfflineStatus = 'preconnecting' | 'connecting' | 'connected' | 'reconnecting' | 'synced' | 'offline'

export default OfflineStatus
