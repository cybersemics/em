// util
import {
  getSetting,
} from '../util'

const themeLocal = localStorage['Settings/Theme'] || 'Dark'
const publish = new URLSearchParams(window.location.search).get('publish') != null

/** Gets the theme, defaulting to localStorage while loading to avoid re-render */
export default state =>
  publish ? 'Light'
  : state.isLoading ? themeLocal
  : (getSetting('Theme', state) || 'Dark')
