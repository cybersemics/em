import _ from 'lodash'
import lifecycle from 'page-lifecycle'
import { Store } from 'redux'
import Path from '../@types/Path'
import State from '../@types/State'
import alert from '../action-creators/alert'
import error from '../action-creators/error'
import setCursor from '../action-creators/setCursor'
import toggleTopControlsAndBreadcrumbs from '../action-creators/toggleTopControlsAndBreadcrumbs'
import * as db from '../data-providers/dexie'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import * as selection from '../device/selection'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import pathExists from '../selectors/pathExists'
import { inputHandlers, isGestureHint } from '../shortcuts'
import isRoot from '../util/isRoot'
import pathToContext from '../util/pathToContext'
import equalPath from './equalPath'
import { keepalive } from './sessionManager'
import { getVisibilityChangeEventName, isTabHidden } from './visibilityApiHelpers'

declare global {
  interface Window {
    __inputHandlers: ReturnType<typeof inputHandlers>
  }
}

/** Add window event handlers. */
const initEvents = (store: Store<State, any>) => {
  let lastState: number // eslint-disable-line fp/no-let
  let lastPath: Path | null // eslint-disable-line fp/no-let

  /** Popstate event listener; setCursor on browser history forward/backward. */
  const onPopstate = (e: PopStateEvent) => {
    const state = store.getState()

    const { path, contextViews } = decodeThoughtsUrl(state)

    if (!lastPath) {
      lastPath = state.cursor
    }

    if (!path || !pathExists(state, pathToContext(state, path)) || equalPath(lastPath, path)) {
      window.history[!lastState || lastState > e.state ? 'back' : 'forward']()
    }

    lastPath = path && pathExists(state, pathToContext(state, path)) ? path : lastPath
    lastState = e.state

    const toRoot = !path || isRoot(path)

    // clear the selection if root
    if (toRoot) {
      selection.clear()
    }

    // set the cursor
    const cursor = toRoot ? null : path

    store.dispatch([
      // check if path is the root, since decodeThoughtsUrl returns a rooted path rather than null
      setCursor({ path: cursor, replaceContextViews: contextViews }),

      // scroll cursor into view
      scrollCursorIntoView(),
    ])
  }

  /** MouseMove event listener. */
  const onMouseMove = _.debounce(() => store.dispatch(toggleTopControlsAndBreadcrumbs(true)), 100, { leading: true })

  /** Url change and reload listener. */
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    const shouldConfirmReload = store.getState().isPushing

    if (shouldConfirmReload) {
      // Note: Showing confirmation dialog can vary between browsers. https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
  }

  /** Error event listener. NOTE: This does not catch React errors. See the ErrorFallback component that is used in the error boundary of the App component. */
  const onError = (e: { message: string; error: Error }) => {
    // ignore generic script error caused by a firebase disconnect (cross-site error)
    // https://blog.sentry.io/2016/05/17/what-is-script-error
    if (e.message === 'Script error.') return

    console.error(e.error.stack)
    db.log({ message: e.message, stack: e.error.stack })
    store.dispatch(error({ value: e.message }))
  }

  /** Handle a page lifecycle state change. */
  const onStateChange = ({ oldState, newState }: { oldState: string; newState: string }) => {
    if (newState === 'hidden') {
      // dismiss the gesture alert if active
      if (isGestureHint(store.getState())) {
        store.dispatch(alert(null))
      }
      // we could also persist unsaved data here
    }
  }

  // store input handlers so they can be removed on cleanup
  const { keyDown, keyUp } = (window.__inputHandlers = inputHandlers(store))

  /** Update local storage sessions used for managing subscriptions. */
  const onTabVisibilityChanged = () => {
    if (!isTabHidden()) {
      keepalive()
    }
  }

  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('popstate', onPopstate)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('error', onError)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener(getVisibilityChangeEventName() || 'focus', onTabVisibilityChanged)

  // clean up when PWA is hidden
  // https://github.com/cybersemics/em/issues/1030
  lifecycle.addEventListener('statechange', onStateChange)

  /** Remove window event handlers. */
  const cleanup = ({ keyDown, keyUp } = window.__inputHandlers || {}) => {
    window.removeEventListener('keydown', keyDown)
    window.removeEventListener('keyup', keyUp)
    window.removeEventListener('popstate', onPopstate)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('error', onError)
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener(getVisibilityChangeEventName() || 'focus', onTabVisibilityChanged)
    lifecycle.removeEventListener('statechange', onStateChange)
  }

  // return input handlers as another way to remove them on cleanup
  return { keyDown, keyUp, cleanup }
}

export default initEvents
