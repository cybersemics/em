import _ from 'lodash'
import { nanoid } from 'nanoid'
import { token } from '../../styled-system/tokens'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from './saveSelectionOffsets'

/** Toggles (hide/show) the Command Universe. Opening it starts a fresh session at the commands root with the search cleared. The sort order the user chose is kept until the app reloads. */
const toggleCommandUniverse = (
  state: State,
  { value, entryId = 'root' }: { value?: boolean; entryId?: string },
): State => {
  const isOpen = value == null ? !state.showCommandUniverse : value
  const isOpening = isOpen && !state.showCommandUniverse
  return {
    ...state,
    showCommandUniverse: isOpen,
    ...(isOpening
      ? {
          commandUniverseNavigation: {
            entries: [{ entryId, page: { pageId: 'commands', props: {} }, arrival: null }],
            index: 0,
            search: '',
            sortOrder: state.commandUniverseNavigation.sortOrder,
          },
        }
      : null),
  }
}

/** Action-creator for toggleCommandUniverse. */
export const toggleCommandUniverseActionCreator =
  ({ value, preserveSelectionOffsets = false }: { value?: boolean; preserveSelectionOffsets?: boolean }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const isOpen = value == null ? !state.showCommandUniverse : value
    const isOpening = isOpen && !state.showCommandUniverse
    const isDesktop = window.matchMedia(`(min-width: ${token('breakpoints.lg')})`).matches
    if (isOpening) {
      // Snapshot the selection before clearing it, so that commands which operate on the selected text can still read
      // it once the Command Universe is open. See state.selectionOffsets.
      if (!preserveSelectionOffsets) dispatch(saveSelectionOffsets())
      if (!isDesktop) selection.clear()
    }
    dispatch({ type: 'toggleCommandUniverse', value, entryId: isOpening ? nanoid() : undefined })
  }

export default _.curryRight(toggleCommandUniverse)

registerActionMetadata('toggleCommandUniverse', {
  undoable: false,
})
