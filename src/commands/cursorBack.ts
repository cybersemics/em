import Command from '../@types/Command'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { isTouch } from '../browser'
import BackIcon from '../components/icons/BackIcon'
import scrollTo from '../device/scrollTo'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
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
  exec: throttleByAnimationFrame((dispatch, getState) => {
    const state = getState()

    // Cancel Clear Thought mode instead of moving the cursor back, otherwise the thought that was just cleared is
    // deselected. When a multiselection is being edited (Clear Thought on a multiselection), this makes the first
    // Escape exit edit mode while keeping the multiselection; the second Escape then clears the multiselection below.
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
