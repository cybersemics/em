import _ from 'lodash'
import { CSSProperties } from 'react'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import keyValueBy from '../util/keyValueBy'
import { getAllChildrenAsThoughts } from './getChildren'

/** Parses the =style or =styleContainer attributes of a given ThoughtId into an object that can be passed to React styles. Returns null if there are no styles. */
const getStyle = (
  state: State,
  id: ThoughtId | null,
  { container }: { container?: boolean } = {},
): CSSProperties | null => {
  if (!id) return null
  const styleId = findDescendant(state, id, container ? '=styleContainer' : '=style')
  if (!styleId) return null

  const children = getAllChildrenAsThoughts(state, styleId)
  const styles = keyValueBy(children, ({ value }) => {
    const styleChildId = findDescendant(state, styleId, value)
    if (!styleChildId) return null
    const styleValueThought = getAllChildrenAsThoughts(state, styleChildId)[0]
    return styleValueThought ? { [_.camelCase(value)]: styleValueThought.value } : null
  })

  return Object.keys(styles).length > 0 ? styles : null
}

export default getStyle
