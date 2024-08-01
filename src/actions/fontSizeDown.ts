import Thunk from '../@types/Thunk'
import { fontSizeActionCreator as setFontSize } from '../actions/fontSize'
import { FONT_SCALE_INCREMENT, MIN_FONT_SIZE } from '../constants'

/** Decreates the font size by FONT_SCALE_INCREMENT, not to exceed the MIN_FONT_SIZE. */
const fontSizeDown = (): Thunk => (dispatch, getState) => {
  const { fontSize } = getState()
  if (fontSize > MIN_FONT_SIZE) {
    dispatch(setFontSize(Math.round((fontSize - FONT_SCALE_INCREMENT) * 10) / 10))
  }
}

export default fontSizeDown
