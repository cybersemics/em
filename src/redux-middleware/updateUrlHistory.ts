import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import Path from '../@types/Path'
import State from '../@types/State'
import { isTouch } from '../browser'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import * as selection from '../device/selection'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import { hasChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import { updateCommandState } from '../stores/commandStateStore'
import ministore from '../stores/ministore'
import storageModel from '../stores/storageModel'
import equalArrays from '../util/equalArrays'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isRoot from '../util/isRoot'

/** Time delay (ms) to throttle the updateUrlHistory middleware so it is not executed on every action. */
const THROTTLE_MIDDLEWARE = 100

/** Only write the cursor every 100 ms. */
const SAVE_CURSOR_THROTTLE = 100

/**
 * How the cursor is written to the address bar. Touch devices replace the current entry rather than
 * pushing a new one, so that the browser's edge-swipe gesture has no stale rendering of em to
 * navigate back to (#4115). The page cannot refuse that gesture — iOS hands the touch to its own
 * recognizer, so preventDefault never runs — which leaves removing its destination as the only
 * remedy. The cost is browser back/forward as cursor navigation, which on touch is unreachable
 * anyway: navigateBack and navigateForward are bound to cmd+[ and cmd+] with no gesture.
 */
const historyMethod = isTouch ? 'replaceState' : 'pushState'

// Both stores below are ministores rather than module variables so that resetStores restores them between tests.
// Nothing subscribes to them, so a write costs one comparison, and the Path is held inside an object because the
// factory merges object updates with a spread, which would flatten an array into keys.

/** The last path that is passed to updateUrlHistoryThrottled. Used to short circuit updateUrlHistory when the cursor hasn't changed without having to call decodeThoughtsUrl which is relatively slow. */
const pathPrevStore = ministore<{ path: Path | null }>({ path: null })

/** The last cursor and the value of its thought. Updated immediately on every action. */
const cursorPrevStore = ministore<{ cursor: Path | null; value: string | null }>({ cursor: null, value: null })

/** Encodes context array into a URL. */
const pathToUrl = (state: State, path: Path) => {
  if (!path || isRoot(path)) return '/'

  const userId = window.location.pathname.split('/')[1] || '~'
  const queryString = window.location.search
  const thoughtsEncoded = path
    // Note: Since thouhtId is a uuid, so they are url safe
    .map((thoughtId, i) => thoughtId + (isContextViewActive(state, path.slice(0, i + 1) as Path) ? '~' : ''))
    .join('/')

  return `/${userId}/${thoughtsEncoded}${queryString}`
}

/** Persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState). Ensure the location does not change through refreshes in standalone PWA mode. */
// TODO: Restore cursor after thoughts replicate
const saveCursor = _.throttle(
  (state: State, path: Path) => {
    if (state.cursor) {
      storageModel.set('cursor', { path, offset: selection.offsetThought() })
    } else {
      storageModel.remove('cursor')
    }
  },
  SAVE_CURSOR_THROTTLE,
  {
    leading: false,
  },
)

/**
 * Sets the url to the given Path. Encodes and persists the cursor to local storage.
 * SIDE EFFECTS: window.history.
 */
const updateUrlHistory = (state: State, path: Path) => {
  // wait until local state has loaded before updating the url
  if (state.isLoading) return

  // If running as a PWA, do not update the browser URL.
  // On iOS, it causes a special browser navigation bar to appear.
  // On Android, it enables swipe navigation at the screen edges.
  // The URL bar is not visible in PWA anyway and cursor is persisted locally.
  // window.navigator.standalone only works on iOS.
  // display-mode: standalone works on Android.
  // See: https://github.com/cybersemics/em/issues/212
  const isPWA = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches

  // if the welcome modal has not been completed and there are no root thoughts, then we can assume that IndexedDB was cleared and clear the obsolete path encoded in the url
  if (
    !isPWA &&
    state.showModal !== 'welcome' &&
    typeof window !== 'undefined' &&
    /\/~\/./.test(window.location.pathname) &&
    !hasChildren(state, HOME_TOKEN)
  ) {
    // preserve the query string
    const url = window.location.search ? `/~/${window.location.search}` : '/'
    window.history[historyMethod]({}, '', url)
  }

  // nothing to update if the cursor has not changed
  if (state.isLoading || equalPath(pathPrevStore.getState().path, path)) return
  pathPrevStore.update({ path })

  const decoded = decodeThoughtsUrl(state)
  const encoded = head(path || HOME_PATH)

  // convert decoded root thought to null cursor
  const decodedPath = decoded.path || [HOME_TOKEN]

  // if we are already on the page we are trying to navigate to (both in thoughts and contextViews), then NOOP
  if (equalArrays(path, decodedPath) && decoded.contextViews[encoded] === state.contextViews[encoded]) return

  const stateWithNewContextViews = {
    ...state,
    contextViews: state.contextViews || decoded.contextViews,
  }

  saveCursor(stateWithNewContextViews, path)

  if (!isPWA) {
    try {
      // update browser history
      window.history[historyMethod](
        // an incrementing ID to track back or forward browser actions
        (window.history.state || 0) + 1,
        '',
        pathToUrl(stateWithNewContextViews, path || [HOME_TOKEN]),
      )
    } catch (e) {
      // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
      console.error(e)
    }
  }
}

// throttles updateUrlHistory and passes it a fresh state when it is called.
const updateUrlHistoryThrottled = _.throttle(getState => {
  const state = getState()
  updateUrlHistory(state, state.cursor)
}, THROTTLE_MIDDLEWARE)

/** Updates the url history after the cursor has changed. The call to updateUrlHistory will short circuit if the cursor has not deviated from the current url. */
const updateUrlHistoryMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)
    updateUrlHistoryThrottled(getState)

    // Update the command state whenever the cursor moves or the cursor thought's value changes.
    // Otherwise the command state will not update when the cursor is moved with no selection (mobile only, when the keyboard is down), since updateCommandState is otherwise only called on selection change.
    // The value changes without a selection change when a formatting edit is undone or redone with the keyboard down, which would otherwise leave a color swatch or formatting command selected for formatting the thought no longer has (#5107).
    const state = getState()
    const cursor = state.cursor
    const cursorThoughtValue = cursor ? (getThoughtById(state, head(cursor))?.value ?? null) : null
    const { cursor: cursorPrev, value: cursorThoughtValuePrev } = cursorPrevStore.getState()
    if (!equalPath(cursor, cursorPrev) || cursorThoughtValue !== cursorThoughtValuePrev) {
      updateCommandState()
    }
    cursorPrevStore.update({ cursor, value: cursorThoughtValue })
  }
}

export default updateUrlHistoryMiddleware
