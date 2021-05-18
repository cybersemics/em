import { publishMode } from '../util'
import { getSetting } from '../selectors'
import { State } from '../util/initialState'
import { ThemeVariant } from '../types'

// eslint-disable-next-line no-mixed-operators
const themeLocal = typeof localStorage !== 'undefined' && localStorage['Settings/Theme'] || 'Dark'

/** Gets the theme, defaulting to localStorage while loading to avoid re-render. */
const theme = (state: State): ThemeVariant =>
  publishMode() ? 'Light'
  : state.isLoading ? themeLocal
  : getSetting(state, 'Theme') || 'Dark'

export default theme
