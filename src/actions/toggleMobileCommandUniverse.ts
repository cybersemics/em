import _ from 'lodash'
import { nanoid } from 'nanoid'
import { token } from '../../styled-system/tokens'
import CommandSortType from '../@types/CommandSortType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import commandUniverseReset from './commandUniverseReset'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from './saveSelectionOffsets'

/** Toggles (hide/show) the mobile command universe. */
const toggleMobileCommandUniverse = (
  state: State,
  { value, entryId, sortOrder }: { value?: boolean; entryId?: string; sortOrder?: CommandSortType },
) => {
  const isOpen = value == null ? !state.showMobileCommandUniverse : value
  return reducerFlow([
    state => ({ ...state, showMobileCommandUniverse: isOpen }),
    isOpen && !state.showMobileCommandUniverse ? state => commandUniverseReset(state, { entryId, sortOrder }) : null,
  ])(state)
}

/** Action-creator for toggleMobileCommandUniverse. */
export const toggleMobileCommandUniverseActionCreator =
  ({ value, preserveSelectionOffsets = false }: { value?: boolean; preserveSelectionOffsets?: boolean }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const isOpen = value == null ? !state.showMobileCommandUniverse : value
    const isOpening = isOpen && !state.showMobileCommandUniverse
    const isDesktop = window.matchMedia(`(min-width: ${token('breakpoints.md')})`).matches
    if (isOpening) {
      // Snapshot the selection before clearing it, so that commands which operate on the selected text can still read
      // it once the Command Universe is open. See state.selectionOffsets.
      if (!preserveSelectionOffsets) dispatch(saveSelectionOffsets())
      if (!isDesktop) selection.clear()
    }
    dispatch({
      type: 'toggleMobileCommandUniverse',
      value,
      entryId: isOpening ? nanoid() : undefined,
      sortOrder: isDesktop ? 'recent' : 'type',
    })
  }

export default _.curryRight(toggleMobileCommandUniverse)

registerActionMetadata('toggleMobileCommandUniverse', {
  undoable: false,
})
