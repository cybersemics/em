import { State } from '../@types'
import { attribute, attributeEquals, getSetting, simplifyPath } from '../selectors'
import { pathToContext, publishMode, unroot } from '../util'
import { storage } from '../util/storage'

// eslint-disable-next-line no-mixed-operators
const themeLocal = (typeof storage !== 'undefined' && storage.getItem('Settings/Theme')) || 'Dark'

/** Gets the theme, defaulting to localStorage while loading to avoid re-render. */
const theme = (state: State) => {
  if (publishMode()) return 'Light'
  if (state.isLoading) return themeLocal

  /** Looks for =focus/Theme in ancestors. */
  const ancestorTheme = () => {
    if (!state.cursor) return null
    const context = pathToContext(simplifyPath(state, state.cursor))
    const theme = context.findIndex((value, i) => {
      const subcontext = context.slice(0, context.length - i)
      // use attributeEquals for O(1) lookup
      return (
        attributeEquals(state, unroot([...subcontext, '=focus']), 'Theme', 'Light') ||
        attributeEquals(state, unroot([...subcontext, '=focus']), 'Theme', 'Dark')
      )
    })
    if (theme === -1) return null
    const ancestorThemeContext = context.slice(0, context.length - theme)
    return attribute(state, [...ancestorThemeContext, '=focus'], 'Theme')
  }

  return ancestorTheme() || getSetting(state, 'Theme') || 'Dark'
}

export default theme
