import { SESSION_COUNT } from '../constants'

/**
 * Get active sessions' count.
 */
export const getSessionCount = (): number | undefined => {
  return JSON.parse(window.localStorage.getItem(SESSION_COUNT) || 'null')
}

/**
 * Increment active sessions' count.
 */
export const incrementSessionCount = () => {
  const sessionCount = window.localStorage.getItem(SESSION_COUNT)
  if (!sessionCount) window.localStorage.setItem(SESSION_COUNT, '1')
  else window.localStorage.setItem(SESSION_COUNT, JSON.parse(sessionCount) + 1)
}

/**
 * Decrement active sessions' count.
 */
export const decrementSessionCount = () => {
  const sessionCount = getSessionCount()
  if (sessionCount) window.localStorage.setItem(SESSION_COUNT, JSON.stringify(JSON.parse(`${sessionCount}`) - 1))
}
