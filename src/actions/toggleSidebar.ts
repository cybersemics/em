import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { isTouch } from '../browser'
import hasMulticursor from '../selectors/hasMulticursor'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import { clearMulticursorsActionCreator as clearMulticursors } from './clearMulticursors'

/** Toggles the sidebar. */
const toggleSidebar = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showSidebar: value == null ? !state.showSidebar : value,
})

/** Action-creator for toggleSidebar. */
export const toggleSidebarActionCreator =
  (payload: Parameters<typeof toggleSidebar>[1]): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const close = !(payload.value ?? !state.showSidebar)

    // Closing the sidebar dismisses a multiselection, as Escape does on desktop, and the caret returns to the cursor
    // thought. Otherwise the cursor thought is refocused while still selected (see useEditMode), which renders the
    // multiselection as being edited (#6227). It is not dismissed on open, since that would focus the cursor thought
    // behind the open sidebar. On touch, opening the sidebar closes the Command Center, which clears the multiselection.
    if (!isTouch && close && state.showSidebar && hasMulticursor(state)) {
      dispatch(clearMulticursors())
    }

    dispatch({ type: 'toggleSidebar', ...payload })
  }

export default _.curryRight(toggleSidebar)

// Register this action's metadata
registerActionMetadata('toggleSidebar', {
  undoable: false,
})
