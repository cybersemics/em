import Command from '../@types/Command'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { isTouch } from '../browser'
import BackIcon from '../components/icons/BackIcon'
import scrollTo from '../device/scrollTo'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isMultiEditing from '../selectors/isMultiEditing'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorBackCommand = {
  id: 'cursorBack',
  label: 'Back' as const,
  description: 'Move the cursor up a level.',
  gesture: 'r',
  svg: BackIcon,
  hideAlert: true,
  keyboard: 'Escape',
  multicursor: false,
  exec: throttleByAnimationFrame((dispatch, getState) => {
    const state = getState()

    // Cancel Clear Thought mode instead of moving the cursor back, otherwise the thought that was just cleared is
    // deselected. A multiselection that is being edited (Clear Thought on a multiselection) exits edit mode the same
    // way, and needs its own predicate since the first edit resets cursorCleared (see editThought): the first Escape
    // exits edit mode while keeping the multiselection, and the second clears the multiselection below.
    if (state.cursorCleared || (!isTouch && isMultiEditing(state))) {
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

    // a multicursor can exist without a cursor, e.g. a thought selected by long press, so it must be checked in addition to the cursor for the selection to be moved back a level (touch only, since escape clears the multicursor on desktop above)
    if (cursor || search != null || hasMulticursor(state)) {
      dispatch(cursorBack())

      // clear browser selection if cursor has been removed
      const { cursor: cursorNew } = getState()
      if (!cursorNew) {
        selection.clear()
      }
    }

    // As a convenience, allow cursorBack to scroll to the top if the cursor is already null.
    // Only do this after the cursor is already null to avoid disrupting the user when they are simply moving up a level to adjust autofocus and immediately back down a level to a sibling.
    // Not when thoughts are selected, since then Back moves the selection rather than the cursor.
    if (!cursor && !hasMulticursor(state)) {
      scrollTo('top', 'smooth')
    }
  }),
} satisfies Command

export default cursorBackCommand
