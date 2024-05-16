import Thunk from '../@types/Thunk'
import { fontSizeActionCreator as setFontSize } from '../actions/fontSize'
import { FONT_SCALE_INCREMENT, MAX_FONT_SIZE, MIN_FONT_SIZE } from '../constants'

/** Increases the font size. */
export const scaleFontUp = (): Thunk => (dispatch, getState) => {
  const { fontSize } = getState()
  if (fontSize < MAX_FONT_SIZE) {
    dispatch(setFontSize(Math.round((fontSize + FONT_SCALE_INCREMENT) * 10) / 10))
  }
}

/** Decreates the font size. */
export const scaleFontDown = (): Thunk => (dispatch, getState) => {
  const { fontSize } = getState()
  if (fontSize > MIN_FONT_SIZE + FONT_SCALE_INCREMENT) {
    dispatch(setFontSize(Math.round((fontSize - FONT_SCALE_INCREMENT) * 10) / 10))
  }
}
