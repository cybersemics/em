import { publishMode } from '../util'
import { getSetting } from '../selectors'
import { State } from '../util/initialState'

const themeLocal = localStorage['Settings/Theme'] || 'Dark'

/** Gets the theme, defaulting to localStorage while loading to avoid re-render. */
const theme = (state: State) =>
  publishMode() ? 'Light'
  : state.isLoading ? themeLocal
  : getSetting(state, 'Theme') || 'Dark'

export default theme
