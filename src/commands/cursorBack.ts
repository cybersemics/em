import Command from '../@types/Command'
import Dispatch from '../@types/Dispatch'
import State from '../@types/State'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { removeMulticursorActionCreator as removeMulticursor } from '../actions/removeMulticursor'
import { isTouch } from '../browser'
import BackIcon from '../components/icons/BackIcon'
import scrollTo from '../device/scrollTo'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import hashPath from '../util/hashPath'
import parentOf from '../util/parentOf'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorBackCommand: Command = {
  id: 'cursorBack',
  label: 'Back',
  description: 'Move the cursor up a level.',
  gesture: 'r',
  svg: BackIcon,
  hideAlert: true,
  keyboard: 'Escape',
  multicursor: false,
  exec: throttleByAnimationFrame((dispatch: Dispatch, getState: () => State) => {
    const state = getState()

    // cancel clear thought mode instead of moving the cursor back, otherwise the thought that was just cleared is deselected
    if (state.cursorCleared) {
      dispatch(cursorCleared({ value: false }))
      selection.clear()
      return
    }

    // clear multicursor on escape (desktop only)
    if (!isTouch && hasMulticursor(state)) {
      dispatch(clearMulticursors())
      return
    }

    // move the multiselect up a level, i.e. deselect the selected thoughts and select their parents
    // thoughts at the root level have no selectable parent, so they are simply deselected
    if (hasMulticursor(state)) {
      const paths = Object.values(state.multicursors)
      const parentPaths = paths.filter(path => path.length > 1).map(parentOf)
      const parentHashes = new Set(parentPaths.map(hashPath))

      dispatch([
        // Select the parents before deselecting their children so that the multiselect is never empty.
        // An empty multiselect closes the Command Center, which clears the multiselect in turn (see multicursorAlertMiddleware and toggleDropdown).
        ...parentPaths.map(path => addMulticursor({ path })),
        // Do not deselect a selected thought that is the parent of another selected thought.
        ...paths.filter(path => !parentHashes.has(hashPath(path))).map(path => removeMulticursor({ path })),
      ])
    }

    const { cursor, search } = state

    if (cursor || search != null) {
      dispatch(cursorBack())

      // clear browser selection if cursor has been removed
      const { cursor: cursorNew } = getState()
      if (!cursorNew) {
        selection.clear()
      }
    }

    // As a convenience, allow cursorBack to scroll to the top if the cursor is already null.
    // Only do this after the cursor is already null to avoid disrupting the user when they are simply moving up a level to adjust autofocus and immediately back down a level to a sibling.
    if (!cursor) {
      scrollTo('top', 'smooth')
    }
  }),
}

export default cursorBackCommand
