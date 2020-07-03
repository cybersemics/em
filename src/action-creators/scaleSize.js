import { getSetting } from '../selectors'

// constants
import {
  FONT_SCALE_INCREMENT,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
} from '../constants'

/** Increases the font size. */
export const scaleFontUp = () => (dispatch, getState) => {
  const fontSize = +getSetting(getState(), 'Font Size')
  if (fontSize < MAX_FONT_SIZE) {
    dispatch({
      type: 'settings',
      key: 'Font Size',
      value: Math.round((fontSize + FONT_SCALE_INCREMENT) * 10) / 10
    })
  }
}

/** Decreates the font size. */
export const scaleFontDown = () => (dispatch, getState) => {
  const fontSize = +getSetting(getState(), 'Font Size')
  if (fontSize > (MIN_FONT_SIZE + FONT_SCALE_INCREMENT)) {
    dispatch({
      type: 'settings',
      key: 'Font Size',
      value: Math.round((fontSize - FONT_SCALE_INCREMENT) * 10) / 10
    })
  }
}
