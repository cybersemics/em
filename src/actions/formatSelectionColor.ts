/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import { commandEmitter } from '../commands'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import isColorSelected from '../util/isColorSelected'
import { formatSelectionActionCreator as formatSelection } from './formatSelection'

/**
 * Applies a text color or background color to the browser selection, matching the behavior of tapping a color swatch. If the color is already applied to the selection, resets it back to the default (toggle off).
 */
export const formatSelectionColorActionCreator =
  ({ color, backgroundColor }: { color?: ColorToken; backgroundColor?: ColorToken }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const selected = isColorSelected(themeColors(state), commandStateStore.getState(), { color, backgroundColor })

    // Note is semi-transparent by default and its color must be reset to that rather than white, which is the fg color for thoughts. (#3902)
    const fgColor = state.noteFocus ? 'fgNote' : 'fg'

    // Flush any pending throttled edit from the Editable so formatSelection reads the latest committed value.
    // A toolbar picker (e.g. ColorPicker) dispatches formatSelection directly, bypassing executeCommand's
    // commandEmitter flush; without this, a still-in-flight typed edit (EDIT_THROTTLE trailing edge) commits AFTER the
    // formatting edit and clobbers it, dropping the applied color/formatting (#4657). The keyboard and gesture command
    // paths already flush via commandEmitter.trigger('command').
    commandEmitter.trigger('command')

    dispatch(
      backgroundColor
        ? formatSelection('backColor', selected ? 'bg' : backgroundColor)
        : formatSelection('foreColor', selected ? fgColor : (color ?? fgColor)),
    )
  }
