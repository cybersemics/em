import { publishMode } from '../util'
import { getSetting } from '../selectors'
import { State } from '../util/initialState'
import { storage } from '../util/localStorage'

// eslint-disable-next-line no-mixed-operators
const themeLocal = (typeof storage !== 'undefined' && storage['Settings/Theme']) || 'Dark'

/** Gets the theme, defaulting to localStorage while loading to avoid re-render. */
const theme = (state: State) =>
  publishMode() ? 'Light' : state.isLoading ? themeLocal : getSetting(state, 'Theme') || 'Dark'

export default theme
