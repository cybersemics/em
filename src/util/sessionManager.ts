import { throttle } from 'lodash'
import { v4 as uuid } from 'uuid'
import { Index } from '../types'

let sessionId: string | null = null

const SESSION_ID_KEY = 'EM_SESSION_ID'
const LOCALSTORAGE_SESSIONIDS = 'EM_SESSION_IDS'
const throttleTimeout = 60000
const sessionInvalidationTimeout = 360000

/** Get current session id. */
export const getSessionId = () => {
  if (!sessionId) {
    sessionId = sessionStorage.getItem(SESSION_ID_KEY) || uuid()
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

/** Add session to local storage list of sessions, or update timestamp if already present. */
export const updateLocalStorageSessionId = () => {
  let localStorageSessions = window.localStorage.getItem(LOCALSTORAGE_SESSIONIDS)
  if (!localStorageSessions) {
    // initialize first
    const initObject = JSON.stringify({})
    window.localStorage.setItem(LOCALSTORAGE_SESSIONIDS, initObject)
    localStorageSessions = initObject
  }
  try {
    const localStorageSessionsIndex: Index = JSON.parse(localStorageSessions)
    const updatedValue = {
      ...localStorageSessionsIndex,
      [sessionId || getSessionId()]: Date.now()
    }
    window.localStorage.setItem(LOCALSTORAGE_SESSIONIDS, JSON.stringify(updatedValue))
  }
  catch (err) {
    console.warn(err)
  }
}

export const updateLocalStorageSessionIdThrottled = throttle(updateLocalStorageSessionId, throttleTimeout)

/** Remove session from to local storage list of sessions if it's invalidated (last updated over 5 minutes). */
export const clearStaleLocalStorageSessionIds = () => {
  const localStorageSessions = window.localStorage.getItem(LOCALSTORAGE_SESSIONIDS)
  if (!localStorageSessions) return
  try {
    const localStorageSessionsIndex: Index = JSON.parse(localStorageSessions)
    const sessionsToKeep = Object.keys(localStorageSessionsIndex).filter(sessionKey => localStorageSessionsIndex[sessionKey] - Date.now() < sessionInvalidationTimeout)
    window.localStorage.setItem(LOCALSTORAGE_SESSIONIDS, JSON.stringify(sessionsToKeep))
  }
  catch (err) {
    console.warn(err)
  }
}
