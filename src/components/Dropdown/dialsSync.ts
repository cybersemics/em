// PROTOTYPE — design dials sync, delete with DropdownDebugPanel once the values are baked.
//
// Shares the panel's dial values between browsers connected to the same Vite dev server (the dialsSync plugin in
// vite.config.ts), with explicit roles so no device's work is overwritten by surprise:
//   - Off: the default. Sends nothing and receives nothing.
//   - Lead: this device's values are the session. Taking Lead pushes them to every follower, and every change is sent.
//     There is one leader per dev server; a device taking Lead demotes the previous leader to Follow.
//   - Follow: applies the leader's values live and sends nothing.
// It rides on Vite's HMR websocket, so it needs no extra server or port and works over whatever URL the device loaded
// the app from. In a production build or a preview deployment there is no HMR connection: isDialsSyncAvailable() is
// false and the other functions do nothing.

/** Dial values keyed by custom property name, as the panel stores them. */
export type DialValues = Record<string, string>

/** This device's part in the session. */
export type DialsSyncMode = 'off' | 'lead' | 'follow'

/** A device as the server knows it. */
export interface DialsDevice {
  id: string
  name: string
}

/** Who is connected: the number of dials panels (this one included), the leader if any, and how many follow it. */
export interface DialsPresence {
  count: number
  leader: DialsDevice | null
  followers: number
}

/** Identifies this browser tab, so it can ignore its own publishes when they echo back. */
export const dialsClientId = Math.random().toString(36).slice(2, 10)

/** A readable name for this device, from its user agent and layout: "Desktop · Chrome", "iPhone · Safari". */
export const dialsDeviceName = (): string => {
  const ua = navigator.userAgent
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : window.innerWidth < 400
          ? 'Phone'
          : 'Desktop'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox|FxiOS/.test(ua)
      ? 'Firefox'
      : /Chrome|CriOS/.test(ua)
        ? 'Chrome'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'Browser'
  return `${device} · ${browser}`
}

/** True on the dev server, where values can be shared between devices. */
export const isDialsSyncAvailable = (): boolean => !!import.meta.hot

/** Registers this panel and its mode with the server. Taking Lead sends this device's values as the session's. */
export const setDialsMode = (mode: DialsSyncMode, values?: DialValues): void => {
  import.meta.hot?.send('dials:mode', { id: dialsClientId, name: dialsDeviceName(), mode, values })
}

/** As leader, sends this device's values to every follower. The server ignores it from anyone but the leader. */
export const publishDials = (values: DialValues): void => {
  import.meta.hot?.send('dials:publish', { id: dialsClientId, values })
}

/** Asks the server for the leader's current values; the answer arrives through subscribeDialsState. */
export const pullDials = (): void => {
  import.meta.hot?.send('dials:pull', {})
}

/** Subscribes to one server event; returns the unsubscribe function, or a no-op where sync is unavailable. */
const on = <T>(event: string, callback: (data: T) => void): (() => void) => {
  const hot = import.meta.hot
  if (!hot) return () => {}
  hot.on(event, callback)
  return () => hot.off(event, callback)
}

/** Calls back with the leader's values whenever they change (this tab's own publishes are skipped). */
export const subscribeDials = (callback: (values: DialValues, leader: DialsDevice) => void) =>
  on<{ values: DialValues; leader: DialsDevice }>('dials:update', message => {
    if (message.leader.id !== dialsClientId) callback(message.values, message.leader)
  })

/** Calls back with the server's answer to pullDials: the leader and its values, or nulls when there is no leader. */
export const subscribeDialsState = (callback: (leader: DialsDevice | null, values: DialValues | null) => void) =>
  on<{ leader: DialsDevice | null; values: DialValues | null }>('dials:state', message =>
    callback(message.leader, message.values),
  )

/** Calls back with who is connected, whenever that changes. */
export const subscribeDialsPresence = (callback: (presence: DialsPresence) => void) =>
  on<DialsPresence>('dials:presence', callback)

/** Calls back when another device takes Lead from this one, with that device. */
export const subscribeDialsDemoted = (callback: (by: DialsDevice) => void) =>
  on<{ id: string; by: DialsDevice }>('dials:demoted', message => {
    if (message.id === dialsClientId) callback(message.by)
  })
