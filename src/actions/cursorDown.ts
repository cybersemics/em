import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setCursor from '../actions/setCursor'
import nextThought from '../selectors/nextThought'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Moves the cursor to the next child, sibling, or nearest uncle. */
const cursorDown = (state: State, { preserveMulticursor }: { preserveMulticursor?: boolean } = {}) => {
  // if there is a cursor, get the next logical child, sibling, or uncle
  const path = nextThought(state)
  return path
    ? setCursor(state, {
        path,
        cursorHistoryClear: true,
        editing: true,
        preserveMulticursor,
      })
    : state
}

export default cursorDown

/** Action-creator for cursorDown. */
export const cursorDownActionCreator =
  (payload?: Parameters<typeof cursorDown>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorDown', ...payload })

// Register this action's metadata
registerActionMetadata('cursorDown', {
  undoable: true,
  isNavigation: true,
})
