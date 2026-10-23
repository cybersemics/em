// PROTOTYPE — design dials sync, delete with DropdownDebugPanel once the values are baked.
//
// Shares the panel's dial values between browsers connected to the same Vite dev server (the dialsSync plugin in
// vite.config.ts). Roles decide only where a session starts, so no device's work is overwritten by surprise:
//   - Off: the default. Sends nothing and receives nothing.
//   - Lead: this device's values seed the session. There is one leader per dev server; a device taking Lead re-seeds
//     the session and demotes the previous leader to Follow.
//   - Follow: starts from the session's values (its own are set aside, and come back on Off).
// Once linked (Lead or Follow), every device edits the session together: changes go out as per-dial patches, and the
// last change to a dial wins, so two people tuning different dials at once don't overwrite each other.
// It rides on Vite's HMR websocket, so it needs no extra server or port and works over whatever URL the device loaded
// the app from. In a production build or a preview deployment there is no HMR connection: isDialsSyncAvailable() is
// false and the other functions do nothing.

/** Dial values keyed by custom property name, as the panel stores them. */
export type DialValues = Record<string, string>

/** Changed dials: a new value, or null for a dial reset to its design value. */
export type DialsPatch = Record<string, string | null>

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

/** Registers this panel and its mode with the server. Taking Lead sends this device's values to seed the session. */
export const setDialsMode = (mode: DialsSyncMode, values?: DialValues): void => {
  import.meta.hot?.send('dials:mode', { id: dialsClientId, name: dialsDeviceName(), mode, values })
}

/** Sends this device's changed dials to the session. The server ignores it from a device that is Off. */
export const sendDialsPatch = (patch: DialsPatch): void => {
  import.meta.hot?.send('dials:patch', { id: dialsClientId, patch })
}

/** Asks the server for the session's current values; the answer arrives through subscribeDialsState. */
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

/** Calls back when a leader seeds the session with its values (skipped on the leader itself). */
export const subscribeDialsSeed = (callback: (values: DialValues, leader: DialsDevice) => void) =>
  on<{ values: DialValues; leader: DialsDevice }>('dials:seed', message => {
    if (message.leader.id !== dialsClientId) callback(message.values, message.leader)
  })

/** Calls back with another linked device's changed dials (this tab's own patches are skipped). */
export const subscribeDialsPatch = (callback: (patch: DialsPatch) => void) =>
  on<{ id: string; patch: DialsPatch }>('dials:patch', message => {
    if (message.id !== dialsClientId) callback(message.patch)
  })

/** Calls back with the server's answer to pullDials: the leader if any, and the session's values, null if unseeded. */
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
