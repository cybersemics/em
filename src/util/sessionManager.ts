/** Manages local sessions (tabs), providing a unique id per session that expires after a period of no use. */
import _ from 'lodash'
import { v4 as uuid } from 'uuid'
import { Index } from '../@types'
import { storage } from '../util/storage'

export enum SessionType {
  LOCAL = 'local',
  REMOTE = 'remote',
}

let sessionId: string | null = null

const SESSION_ID_KEY = 'EM_SESSION_ID'
const LOCALSTORAGE_SESSIONIDS = 'EM_SESSION_IDS'
const throttleTimeout = 5000
const sessionInvalidationTimeout = 360000

/** Get current session id. */
export const getSessionId = () => {
  if (!sessionId) {
    sessionId = sessionStorage.getItem(SESSION_ID_KEY) || uuid()
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

/** Check if the current or given session is local/remote. */
export const getSessionType = (sessionId?: string): SessionType | undefined => {
  if (!sessionId) return
  const localSessionsRaw = storage.getItem(LOCALSTORAGE_SESSIONIDS)
  if (!localSessionsRaw) return
  try {
    const localSessions: Index<string> = JSON.parse(localSessionsRaw)
    return localSessions[sessionId] ? SessionType.LOCAL : SessionType.REMOTE
  } catch (err) {
    console.error(`Invalid localStorage.${LOCALSTORAGE_SESSIONIDS}: ${localSessionsRaw}`)
    console.error(err)
  }
}

/** Add current session to local storage list of sessions, or update timestamp if already present. Removes any sessions that are expired. */
export const updateLocalStorageSessionId = _.throttle(() => {
  // read localSessions
  const localSessionsRaw = storage.getItem(LOCALSTORAGE_SESSIONIDS) || '{}'
  try {
    const localSessions: Index<string> = JSON.parse(localSessionsRaw)
    const sessionsNew = {
      // filter out expired
      ..._.pickBy(localSessions, (updated, key) => Date.now() - +updated < sessionInvalidationTimeout),
      // add current session
      [sessionId || getSessionId()]: Date.now(),
    }
    // write localSessions
    storage.setItem(LOCALSTORAGE_SESSIONIDS, JSON.stringify(sessionsNew))
  } catch (err) {
    console.error(`Invalid localStorage.${LOCALSTORAGE_SESSIONIDS}: ${localSessionsRaw}`)
    console.error(err)
  }
}, throttleTimeout)
