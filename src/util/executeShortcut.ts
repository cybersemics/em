import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Shortcut from '../@types/Shortcut'
import ShortcutType from '../@types/ShortcutType'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { AlertType, noop } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import pathToThought from '../selectors/pathToThought'
import globalStore from '../stores/app'
import dispatch from '../test-helpers/dispatch'

interface Options {
  store?: Store<State, any>
  type?: ShortcutType
  event?: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
}

const eventNoop = { preventDefault: noop } as Event

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
  // Sort the paths deterministically: prefer ancestors over descendants, then go by rank.
  paths.sort((a, b) =>
    a.length === b.length
      ? (pathToThought(state, a)?.rank ?? 0) - (pathToThought(state, b)?.rank ?? 0)
      : a.length - b.length,
  )

  if (multicursorConfig.execMulticursor) {
    // The shortcut has their own multicursor logic, so delegate to it.
    return await multicursorConfig.execMulticursor(paths, store.dispatch, store.getState, event, { type })
  } else {
    // Execute the shortcut for each multicursor path and restore the cursor to its original position.
    for (const path of paths) {
      await store.dispatch(setCursor({ path }))
      await executeShortcut(shortcut, { store, type, event })
    }

    // Restore the cursor to its original position if not prevented.
    if (!multicursorConfig.preventSetCursor) await store.dispatch(setCursor({ path: cursorBeforeMulticursor }))
  }
}

export default executeShortcut
