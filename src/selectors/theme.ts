// import attribute, attributeEquals, getSetting, simplifyPath from '../selectors/attribute, attributeEquals, getSetting, simplifyPath'
// import pathToContext, publishMode, unroot from '../util/pathToContext, publishMode, unroot'
import getSetting from '../selectors/getSetting'
import storage from '../util/storage'
import publishMode from '../util/publishMode'
import State from '../@types/State'

// eslint-disable-next-line no-mixed-operators
const themeLocal = (typeof storage !== 'undefined' && storage.getItem('Settings/Theme')) || 'Dark'

// disable ancestorTheme until we have better memoization
/** Looks for =focus/Theme in cursor ancestors. */
// const ancestorTheme = (state: State) => {
//   if (!state.cursor) return null
//   const context = pathToContext(simplifyPath(state, state.cursor))
//   console.log('ancestorTheme', context)
//   const theme = context.findIndex((value, i) => {
//     const subcontext = context.slice(0, context.length - i)
//     // use attributeEquals for O(1) lookup
//     return (
//       attributeEquals(state, unroot([...subcontext, '=focus']), 'Theme', 'Light') ||
//       attributeEquals(state, unroot([...subcontext, '=focus']), 'Theme', 'Dark')
//     )
//   })
//   if (theme === -1) return null
//   const ancestorThemeContext = context.slice(0, context.length - theme)
//   return attribute(state, [...ancestorThemeContext, '=focus'], 'Theme')
// }

/** Gets the theme, defaulting to localStorage while loading to avoid re-render. */
const theme = (state: State) => {
  if (publishMode()) return 'Light'
  if (state.isLoading) return themeLocal

  // return ancestorTheme(state) || getSetting(state, 'Theme') || 'Dark'
  return getSetting(state, 'Theme') || 'Dark'
}

export default theme
