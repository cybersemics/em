import Thunk from '../@types/Thunk'
import { fontSizeActionCreator as setFontSize } from '../actions/fontSize'
import { FONT_SCALE_INCREMENT, MAX_FONT_SIZE } from '../constants'

/** Increases the font size by FONT_SCALE_INCREMENT, not to exceed the MAX_FONT_SIZE. */
const fontSizeUp = (): Thunk => (dispatch, getState) => {
  const { fontSize } = getState()
  if (fontSize < MAX_FONT_SIZE) {
    dispatch(setFontSize(Math.round((fontSize + FONT_SCALE_INCREMENT) * 10) / 10))
  }
}

export default fontSizeUp
