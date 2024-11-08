import State from '../@types/State'
import getSetting from '../selectors/getSetting'
import publishMode from '../util/publishMode'

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

/** Gets the theme. */
const theme = (state: State) => {
  if (publishMode()) return 'Light'
  return getSetting(state, 'Theme') || state.storageCache?.theme || 'Dark'
}

export default theme
