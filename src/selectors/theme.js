// util
import {
  getSetting,
  publishMode,
} from '../util'

const themeLocal = localStorage['Settings/Theme'] || 'Dark'

/** Gets the theme, defaulting to localStorage while loading to avoid re-render */
export default state =>
  publishMode() ? 'Light'
  : state.isLoading ? themeLocal
  : (getSetting('Theme', state) || 'Dark')
