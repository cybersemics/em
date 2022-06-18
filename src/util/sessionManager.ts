/** Manages local sessions (tabs), providing a unique id per session that expires after a period of no use. */
import _ from 'lodash'
import { v4 as uuid } from 'uuid'
import Index from '../@types/IndexType'
import storage from '../util/storage'
import storeSession from '../util/storeSession'

export enum SessionType {
  LOCAL = 'local',
  REMOTE = 'remote',
}

/** A unique session id for the current session. Gets instantiated to a uuid on the first call to getSessionId. */
let sessionId: string | null = null

/** A local storage sessions cache. */
let localSessionsCache: Index<string>

const SESSION_ID_KEY = 'EM_SESSION_ID'
const LOCALSTORAGE_SESSIONIDS = 'EM_SESSION_IDS'
const throttleGet = 1000
const throttleKeepalive = 5000
const sessionInvalidationTimeout = 360000

/******************************************************************************
 * Local Storage and Caching
 *****************************************************************************/

/** Gets the local sessions and stores them in the local session cache. */
const getLocalSessionIds = _.throttle(() => {
  const localSessionsRaw = storage.getItem(LOCALSTORAGE_SESSIONIDS) || '{}'
  try {
    localSessionsCache = JSON.parse(localSessionsRaw)
  } catch (err) {
    console.error(`Invalid localStorage.${LOCALSTORAGE_SESSIONIDS}: ${localSessionsRaw}`)
    console.error(err)
  }
  return localSessionsCache
}, throttleGet)

/** Writes local sessions to storage and sets the local session cache. */
const setLocalSessionIds = (sessionsNew: Index<string>) => {
  localSessionsCache = sessionsNew
  storage.setItem(LOCALSTORAGE_SESSIONIDS, JSON.stringify(sessionsNew))
}

/******************************************************************************
 * Public
 *****************************************************************************/

/** Saves session id on startup. The sessionId may have already been initialized in-memory via getSessionId, but it still needs to be persisted to local storage. */
export const init = () => {
  keepalive()
}

/** Get current session id. If not initiated, create a new uuid and save it to storage. */
export const getSessionId = () => {
  if (typeof storeSession === undefined) {
    sessionId = 'NO_SESSION_STORAGE'
  } else if (!sessionId) {
    sessionId = storeSession.getItem(SESSION_ID_KEY) || uuid()
    storeSession.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

/** Check if the current or given session is local/remote. */
export const getSessionType = (sessionId?: string): SessionType | undefined => {
  if (!sessionId) return
  const localSessions = getLocalSessionIds() || {}
  return localSessions[sessionId] ? SessionType.LOCAL : SessionType.REMOTE
}

/** Add current session to local storage list of sessions, or update timestamp if already present. Removes any sessions that are expired. */
export const keepalive = _.throttle(() => {
  const localSessions = getLocalSessionIds() || {}
  const sessionsNew = {
    // filter out expired
    ..._.pickBy(localSessions, (updated, key) => Date.now() - +updated < sessionInvalidationTimeout),
    // add current session
    [sessionId || getSessionId()]: Date.now().toString(),
  }
  // write sessions
  setLocalSessionIds(sessionsNew)
}, throttleKeepalive)
