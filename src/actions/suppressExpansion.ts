import Thunk from '../@types/Thunk'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import globals from '../globals'

let timer: ReturnType<typeof setTimeout>

/** Supress context expansion for a short duration (default: 100ms). This avoids performance issues when desktop users hold ArrowDown or ArrowUp to move across many siblings. The state can be accessed with globals.suppressExpansion. If value is false, disables suppressExpansion immediately, cancels, the timer, and dispatches setCursor to re-trigger expandThoughts. */
// duration of 66.666ms (4 frames) is low enough to be unnoticeable and high enough to cover the default key repeat rate on most machines (30ms)
export const suppressExpansionActionCreator =
  (value?: boolean, { duration }: { duration: number } = { duration: 66.666 }): Thunk =>
  (dispatch, getState) => {
    // suppress expansion by default
    value = value ?? true

    /** Disables suppressExpansion and sets the cursor to re-trigger expandThoughts. */
    const unsuppress = () => {
      globals.suppressExpansion = false
      const { cursor, noteFocus } = getState()
      dispatch(setCursor({ path: cursor, noteFocus })) // preserve noteFocus
    }

    /** Enables the global suppressExpansion flag. */
    const suppress = () => {
      globals.suppressExpansion = true
    }

    clearTimeout(timer)

    if (!value) {
      unsuppress()
    } else {
      suppress()

      // re-enable expansion after short delay
      timer = setTimeout(() => {
        if (globals.suppressExpansion) {
          unsuppress()
        }
      }, duration)
    }
  }
