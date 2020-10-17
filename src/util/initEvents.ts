import { store } from '../store'
import { inputHandlers } from '../shortcuts'
import * as db from '../data-providers/dexie'
import { clearSelection, isRoot, scrollCursorIntoView } from '../util'
import _ from 'lodash'

// util
import { decodeThoughtsUrl } from '../selectors'
import { toggleTopControlsAndBreadcrumbs } from '../action-creators'

declare global {
  interface Window {
    __inputHandlers: ReturnType<typeof inputHandlers>,
  }
}

/** Popstate event listener; setCursor on browser history forward/backward. */
const onPopstate = () => {
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(store.getState(), window.location.pathname)
  const toRoot = !thoughtsRanked || isRoot(thoughtsRanked)

  // clear the selection if root
  if (toRoot) {
    clearSelection()
  }

  // set the cursor
  // check if thoughtsRanked is the root, since decodeThoughtsUrl returns a rooted path rather than null
  store.dispatch({ type: 'setCursor', thoughtsRanked: toRoot ? null : thoughtsRanked, replaceContextViews: contextViews })

  // scroll cursor into view
  setTimeout(scrollCursorIntoView)
}

/** MouseMove event listener. */
const onMouseMove = _.debounce(() =>
  store.dispatch(toggleTopControlsAndBreadcrumbs(true)), 100, { leading: true }
)

/** Error event listener. NOTE: This does not catch React errors. See the ErrorFallback component that is used in the error boundary of the App component. */
const onError = (e: { message: string, error: Error }) => {
  // ignore generic script error caused by a firebase disconnect (cross-site error)
  // https://blog.sentry.io/2016/05/17/what-is-script-error
  if (e.message === 'Script error.') return

  console.error(e.error.stack)
  db.log({ message: e.message, stack: e.error.stack })
  store.dispatch({ type: 'error', value: e.message })
}

/** Add window event handlers. */
export const initEvents = () => {

  // store input handlers so they can be removed on cleanup
  const { keyDown, keyUp } = window.__inputHandlers = inputHandlers(store)

  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('popstate', onPopstate)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('error', onError)

  // return input handlers as another way to remove them on cleanup
  return { keyDown, keyUp }
}

/** Remove window event handlers. */
export const cleanup = ({ keyDown, keyUp } = window.__inputHandlers || {}) => {
  window.removeEventListener('keydown', keyDown)
  window.removeEventListener('keyup', keyUp)
  window.removeEventListener('popstate', onPopstate)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('error', onError)
}
