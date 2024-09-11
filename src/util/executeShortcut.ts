import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Shortcut from '../@types/Shortcut'
import ShortcutType from '../@types/ShortcutType'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { AlertType, noop } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import globalStore from '../stores/app'
import dispatch from '../test-helpers/dispatch'

interface Options {
  store?: Store<State, any>
  type?: ShortcutType
  event?: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
  /** Whether to allow multicursor mode for executing the shortcut. */
  multicursor?: boolean
}

const eventNoop = { preventDefault: noop } as Event

/** Execute shortcut. Defaults to global store and keyboard shortcut. */
const executeShortcut = async (shortcut: Shortcut, { store, type, event, multicursor }: Options = {}) => {
  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !shortcut.canExecute || shortcut.canExecute(store.getState)
  // Exit early if the shortcut cannot execute
  if (!canExecute) return

  const state = store.getState()

  const shouldExecuteMulticursor = multicursor && hasMulticursor(state) && shortcut.multicursor !== 'ignore'

  if (shouldExecuteMulticursor) {
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

    // For each multicursor, place the cursor on the path and execute the shortcut by recursively calling executeShortcut.
    const paths = Object.values(state.multicursors)
    const cursorBeforeMulticursor = state.cursorBeforeMulticursor

    if (multicursorConfig.execMulticursor) {
      // The shortcut has their own multicursor logic, so delegate to it.
      return await multicursorConfig.execMulticursor(paths, store.dispatch, store.getState, event, { type })
    } else {
      // Execute the shortcut for each multicursor path and restore the cursor to its original position.
      for (const path of paths) {
        await store.dispatch(setCursor({ path }))
        await executeShortcut(shortcut, { store, type, event, multicursor: false })
      }

      // Restore the cursor to its original position.
      await store.dispatch(setCursor({ path: cursorBeforeMulticursor }))
    }
  } else {
    // execute single shortcut
    await shortcut.exec(store.dispatch, store.getState, event, { type })
  }
}

export default executeShortcut
