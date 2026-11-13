import _ from 'lodash'
import { nanoid } from 'nanoid'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import commandUniverseSearchSortStore from '../stores/commandUniverseSearchSortStore'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import matchesBreakpoint from '../util/matchesBreakpoint'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from './saveSelectionOffsets'

/** Toggles (hide/show) the mobile command universe. Opening it starts a fresh session at the commands root with the search cleared. The sort order the user chose is kept until the app reloads. */
const toggleMobileCommandUniverse = (
  state: State,
  { value, entryId = 'root' }: { value?: boolean; entryId?: string },
): State => {
  const isOpen = value == null ? !state.showMobileCommandUniverse : value
  const isOpening = isOpen && !state.showMobileCommandUniverse
  return {
    ...state,
    showMobileCommandUniverse: isOpen,
    ...(isOpening
      ? {
          commandUniverseNavigation: {
            entries: [{ entryId, page: { pageId: 'commands', props: {} }, arrival: null }],
            index: 0,
          },
        }
      : null),
  }
}

/** Action-creator for toggleMobileCommandUniverse. */
export const toggleMobileCommandUniverseActionCreator =
  ({ value, preserveSelectionOffsets = false }: { value?: boolean; preserveSelectionOffsets?: boolean }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const isOpen = value == null ? !state.showMobileCommandUniverse : value
    const isOpening = isOpen && !state.showMobileCommandUniverse
    const isDesktop = matchesBreakpoint('lg')
    if (isOpening) {
      commandUniverseSearchSortStore.update({ search: '' })
      // Snapshot the selection before clearing it, so that commands which operate on the selected text can still read
      // it once the Command Universe is open. See state.selectionOffsets.
      if (!preserveSelectionOffsets) dispatch(saveSelectionOffsets())
      if (!isDesktop) selection.clear()
    }
    dispatch({ type: 'toggleMobileCommandUniverse', value, entryId: isOpening ? nanoid() : undefined })
  }

export default _.curryRight(toggleMobileCommandUniverse)

registerActionMetadata('toggleMobileCommandUniverse', {
  undoable: false,
})
