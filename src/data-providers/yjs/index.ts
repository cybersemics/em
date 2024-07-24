import { nanoid } from 'nanoid'
import WebsocketStatus from '../../@types/WebsocketStatus'
import storage from '../../util/storage'

const host = import.meta.env.VITE_WEBSOCKET_HOST || 'localhost'
const port = import.meta.env.VITE_WEBSOCKET_PORT || (host === 'localhost' ? 3001 : '')
const protocol = host === 'localhost' ? 'ws' : 'wss'

export const websocketUrl = `${protocol}://${host}${port ? ':' + port : ''}/hocuspocus`

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

// websocket provider
export interface ProviderWebsocket {
  on: (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback: (...args: any[]) => void) => void
  status: WebsocketStatus
}

export const websocket: ProviderWebsocket = {
  on: (event: string, callback: (...args: any[]) => void) => {},
  off: (event: string, callback: (...args: any[]) => void) => {},
  status: 'disconnected',
}
