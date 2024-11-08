import _ from 'lodash'
import { CSSProperties } from 'react'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import keyValueBy from '../util/keyValueBy'
import { anyChild, getAllChildrenAsThoughts } from './getChildren'
import themeColors from './themeColors'

/** Parses the =style attributes of a given ThoughtId into an object that can be passed to React styles. Returns null if there are no styles. */
const getStyle = (
  state: State,
  id: ThoughtId | null,
  // defaults to =style
  { attributeName }: { attributeName?: string } = {},
): CSSProperties | null => {
  if (!id) return null
  const styleId = findDescendant(state, id, attributeName || '=style')
  if (!styleId) return null

  const colors = themeColors(state)
  const children = getAllChildrenAsThoughts(state, styleId)
  const styles = keyValueBy(children, ({ value }) => {
    const styleChildId = findDescendant(state, styleId, value)
    if (!styleChildId) return null
    const styleValueThought = anyChild(state, styleChildId)
    if (!styleValueThought) return null
    const styleKey = _.camelCase(value)

    // allow color names from em themeColors
    // overwrites conflicting HTML color names
    // this is how text color and background color are applied via the normal =style attribute
    const styleValue =
      styleKey === 'color' || styleKey === 'backgroundColor'
        ? colors[styleValueThought.value as keyof typeof colors] || styleValueThought.value
        : styleValueThought.value

    return { [styleKey]: styleValue }
  })

  return Object.keys(styles).length > 0 ? styles : null
}

export default getStyle
