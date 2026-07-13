/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import themeColors from '../selectors/themeColors'
import batchEditingStore from '../stores/batchEditing'
import commandStateStore from '../stores/commandStateStore'
import isColorSelected from '../util/isColorSelected'
import { formatSelectionActionCreator as formatSelection } from './formatSelection'

/**
 * Applies a text color and/or background color to the browser selection, matching the behavior of tapping a color swatch. If the color is already applied to the selection, resets the text color and background color back to their defaults (toggle off).
 */
export const formatSelectionColorActionCreator =
  ({ color, backgroundColor }: { color?: ColorToken; backgroundColor?: ColorToken }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const selected = isColorSelected(themeColors(state), commandStateStore.getState(), { color, backgroundColor })

    // Note is semi-transparent by default and its color must be reset to that rather than white, which is the fg color for thoughts. (#3902)
    const fgColor = state.noteFocus ? 'fgNote' : 'fg'
    dispatch(
      formatSelection(
        'foreColor',
        selected ? fgColor : color || (backgroundColor && backgroundColor !== 'fg' ? 'black' : 'bg'),
      ),
    )

    batchEditingStore.update(true)
    // Apply background color to the selection
    dispatch(formatSelection('backColor', selected ? 'bg' : (backgroundColor ?? 'bg')))
    batchEditingStore.update(false)
  }
