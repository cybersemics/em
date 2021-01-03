import { DEFAULT_FONT_SIZE } from '../constants'
import { State } from '../util/initialState'
import getSetting from './getSetting'
const fontSizeLocal = +(localStorage['Settings/Font Size'] || DEFAULT_FONT_SIZE)

/** Returns application's font size. */
const getFontSize = (state: State) => state.isLoading ? fontSizeLocal : +(getSetting(state, 'Font Size') || DEFAULT_FONT_SIZE)

export default getFontSize
