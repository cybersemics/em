import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setCursor from '../actions/setCursor'
import { HOME_TOKEN } from '../constants'
import { getChildrenSorted } from '../selectors/getChildren'
import prevThought from '../selectors/prevThought'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Moves the cursor to the previous visible thought in visual order. If there is no cursor, sets the cursor on the last thought in the home context. */
const cursorUp = (state: State, { preserveMulticursor }: { preserveMulticursor?: boolean } = {}) => {
  const { cursor } = state

  const path = cursor
    ? // if cursor exists, get the previous thought in visual order
      prevThought(state, cursor)
    : // otherwise, get the last thought in the home context
      getChildrenSorted(state, HOME_TOKEN).at(-1)?.id
      ? ([getChildrenSorted(state, HOME_TOKEN).at(-1)!.id] as Path)
      : null

  // noop if there is no previous path, i.e. the cursor is on the very first thought
  return path && path.length > 0
    ? setCursor(state, {
        path: path,
        preserveMulticursor,
      })
    : state
}

/** Action-creator for cursorUp. */
export const cursorUpActionCreator =
  (payload?: Parameters<typeof cursorUp>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'cursorUp', ...payload })

export default cursorUp

// Register this action's metadata
registerActionMetadata('cursorUp', {
  undoable: true,
  isNavigation: true,
})
