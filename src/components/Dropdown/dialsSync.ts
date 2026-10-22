// PROTOTYPE — design dials sync, delete with DropdownDebugPanel once the values are baked.
//
// Shares the panel's dial values between every browser connected to the same Vite dev server (the dialsSync plugin
// in vite.config.ts), so values tuned on the desktop can be seen on a phone, and the other way round. It rides on
// Vite's HMR websocket, so it needs no extra server or port and works over whatever URL the device loaded the app
// from. In a production build or a preview deployment there is no HMR connection: isDialsSyncAvailable() is false
// and the other functions do nothing.

/** Dial values keyed by custom property name, as the panel stores them. */
export type DialValues = Record<string, string>

/** Who sent a set of values, and when (ms since epoch). The latest publish wins. */
export interface DialsSyncMeta {
  from: string
  at: number
}

interface DialsMessage extends DialsSyncMeta {
  values: DialValues
}

/** Identifies this browser tab, so it can ignore its own publishes when they echo back. */
export const dialsClientId = Math.random().toString(36).slice(2, 10)

/** True on the dev server, where values can be shared between devices. */
export const isDialsSyncAvailable = (): boolean => !!import.meta.hot

/** Sends this device's values to every connected device, and leaves them on the server for devices that join later. */
export const publishDials = (values: DialValues): void => {
  const message: DialsMessage = { values, from: dialsClientId, at: Date.now() }
  import.meta.hot?.send('dials:publish', message)
}

/**
 * Asks the server for the session's latest values. The server always answers, through subscribeDialsState, with null
 * when nobody has published yet.
 */
export const pullDials = (): void => {
  import.meta.hot?.send('dials:pull', {})
}

/** Calls back with the server's answer to pullDials: the latest publish, or null for an empty session. */
export const subscribeDialsState = (callback: (latest: (DialsSyncMeta & { values: DialValues }) | null) => void) => {
  const hot = import.meta.hot
  if (!hot) return () => {}
  /** Forwards the server's answer. */
  const onState = (message: { latest: DialsMessage | null }) => callback(message.latest)
  hot.on('dials:state', onState)
  return () => hot.off('dials:state', onState)
}

/** Registers this panel with the server, so every device can see how many panels share the session. */
export const announceDials = (): void => {
  import.meta.hot?.send('dials:hello', { from: dialsClientId })
}

/** Calls back with how many dials panels are connected to this dev server, this one included. */
export const subscribeDialsPeers = (callback: (count: number) => void): (() => void) => {
  const hot = import.meta.hot
  if (!hot) return () => {}
  /** Forwards the server's count. */
  const onPeers = (message: { count: number }) => callback(message.count)
  hot.on('dials:peers', onPeers)
  return () => hot.off('dials:peers', onPeers)
}

/**
 * Calls back with values published by other devices (this tab's own publishes are skipped). Returns an unsubscribe
 * function. For auto-sync, subscribe once and publish on every change; for a manual sync button, publish on press.
 */
export const subscribeDials = (callback: (values: DialValues, meta: DialsSyncMeta) => void): (() => void) => {
  const hot = import.meta.hot
  if (!hot) return () => {}
  /** Forwards another device's values; drops echoes of this tab's own publishes. */
  const onUpdate = (message: DialsMessage) => {
    if (message.from === dialsClientId) return
    callback(message.values, { from: message.from, at: message.at })
  }
  hot.on('dials:update', onUpdate)
  return () => hot.off('dials:update', onUpdate)
}
