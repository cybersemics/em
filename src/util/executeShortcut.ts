import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Shortcut from '../@types/Shortcut'
import ShortcutType from '../@types/ShortcutType'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { alertActionCreator as alert } from '../actions/alert'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { AlertType, HOME_PATH, noop } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import thoughtToPath from '../selectors/thoughtToPath'
import globalStore from '../stores/app'
import dispatch from '../test-helpers/dispatch'
import equalPath from './equalPath'
import head from './head'

interface Options {
  store?: Store<State, any>
  type?: ShortcutType
  event?: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
}

const eventNoop = { preventDefault: noop } as Event

/** Recomputes the path to a thought. Returns null if the thought does not exist. */
const recomputePath = (state: State, thoughtId: ThoughtId) => {
  const path = thoughtToPath(state, thoughtId)

  if (path && equalPath(path, HOME_PATH)) return null

  return path
}

/** Execute a single shortcut. Defaults to global store and keyboard shortcut. Use `executeShortcutWithMulticursor` to execute a shortcut with multicursor mode. */
const executeShortcut = async (shortcut: Shortcut, { store, type, event }: Options = {}) => {
  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState)
  // Exit early if the shortcut cannot execute
  if (!canExecute) return

  // execute single shortcut
  await shortcut.exec(store.dispatch, store.getState, event, { type })
}

/** Execute shortcut. Defaults to global store and keyboard shortcut. */
export const executeShortcutWithMulticursor = async (shortcut: Shortcut, { store, type, event }: Options = {}) => {
  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState)
  // Exit early if the shortcut cannot execute
  if (!canExecute) return

  const state = store.getState()

  const shouldExecuteMulticursor = hasMulticursor(state) && shortcut.multicursor !== 'ignore'

  // If we don't have active multicursors or the shortcut ignores multicursors, execute the shortcut normally.
  if (!shouldExecuteMulticursor) return executeShortcut(shortcut, { store, type, event })

  const multicursorConfig =
    typeof shortcut.multicursor === 'object'
      ? shortcut.multicursor
      : shortcut.multicursor
        ? { enabled: true }
        : { enabled: false }

  // multicursor is not enabled for this shortcut, alert and exit early
  if (!multicursorConfig.enabled) {
    dispatch(
      alert(multicursorConfig.error?.(store.getState) ?? 'Cannot execute this shortcut with multiple thoughts.', {
        alertType: AlertType.MulticursorError,
        clearDelay: 5000,
      }),
    )
    return
  }

  const cursorBeforeMulticursor = state.cursorBeforeMulticursor
  // For each multicursor, place the cursor on the path and execute the shortcut by calling executeShortcut.
  const paths = Object.values(state.multicursors)
  // Sort the paths deterministically in document order
  paths.sort((a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const aRank = getThoughtById(state, a[i]).rank
      const bRank = getThoughtById(state, b[i]).rank
      if (aRank !== bRank) return aRank - bRank
    }
    return a.length - b.length
  })

  // Reverse the order of the cursors if the shortcut has reverse multicursor mode enabled.
  if (multicursorConfig.reverse) {
    paths.reverse()
  }

  if (multicursorConfig.execMulticursor) {
    // The shortcut has their own multicursor logic, so delegate to it.
    await multicursorConfig.execMulticursor(paths, store.dispatch, store.getState, event, { type })
  } else {
    // Execute the shortcut for each multicursor path and restore the cursor to its original position.
    for (const path of paths) {
      // Make sure we have the correct path to the thought in case it was moved during execution.
      const recomputedPath = recomputePath(state, head(path))
      if (!recomputedPath) continue

      await store.dispatch(setCursor({ path: recomputedPath }))
      await executeShortcut(shortcut, { store, type, event })
    }

    // Restore the cursor to its original position if not prevented.
    if (!multicursorConfig.preventSetCursor) await store.dispatch(setCursor({ path: cursorBeforeMulticursor }))
  }

  // Restore multicursors
  return await store.dispatch(
    paths.map(path => (dispatch, getState) => {
      const recomputedPath = recomputePath(getState(), head(path))
      if (!recomputedPath) return
      dispatch(addMulticursor({ path: recomputedPath }))
    }),
  )
}

export default executeShortcut
