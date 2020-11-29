import { getSetting } from '../selectors'
import { settings } from '../action-creators'
import { DEFAULT_FONT_SIZE, FONT_SCALE_INCREMENT, MAX_FONT_SIZE, MIN_FONT_SIZE } from '../constants'
import { Thunk } from '../types'

/** Increases the font size. */
export const scaleFontUp = (): Thunk => (dispatch, getState) => {
  const fontSize = +(getSetting(getState(), 'Font Size') || DEFAULT_FONT_SIZE)
  if (fontSize < MAX_FONT_SIZE) {
    dispatch(settings({
      key: 'Font Size',
      value: (Math.round((fontSize + FONT_SCALE_INCREMENT) * 10) / 10).toString()
    }))
  }
}

/** Decreates the font size. */
export const scaleFontDown = (): Thunk => (dispatch, getState) => {
  const fontSize = +(getSetting(getState(), 'Font Size') || DEFAULT_FONT_SIZE)
  if (fontSize > (MIN_FONT_SIZE + FONT_SCALE_INCREMENT)) {
    dispatch(settings({
      key: 'Font Size',
      value: (Math.round((fontSize - FONT_SCALE_INCREMENT) * 10) / 10).toString()
    }))
  }
}
