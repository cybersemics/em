/* eslint-disable import/prefer-default-export */
import { nanoid } from 'nanoid'
import storage from '../util/storage'

/** Secret access token for this device. */
export const accessTokenLocal = storage.getItem('accessToken', () => nanoid(21))

/** Unique thoughtspace id for this device (default doc id). Share via ?share={docId} when using sync. */
export const tsidLocal = storage.getItem('tsid', () => nanoid(21))

/** Share link doc id from URL when present. */
export const tsidShared = new URLSearchParams(window.location?.search).get('share')
const accessTokenShared = new URLSearchParams(window.location?.search).get('auth')

export const tsid = tsidShared || tsidLocal
export const accessToken = accessTokenShared || accessTokenLocal

/** Public key derived from the access token. Not set until clientIdReady resolves. */
export let clientId = ''

/** Encodes binary data in base64. */
async function bufferToBase64(buffer: ArrayBuffer) {
  const base64url = await new Promise<string>(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(new Blob([buffer]))
  })
  return base64url.slice(base64url.indexOf(',') + 1)
}

/** Resolves when clientId is available to use synchronously. */
export const clientIdReady = (
  crypto.subtle
    ? crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken)).then(bufferToBase64)
    : Promise.resolve(nanoid())
).then(s => {
  clientId = s
  return s
})
