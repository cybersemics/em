import { CSSProperties } from 'react'
import _ from 'lodash'
import { keyValueBy } from '../util'
import { findDescendant } from '../selectors'
import { getAllChildrenAsThoughts } from './getChildren'
import { State, ThoughtId } from '../@types'

/** Parses the =style attribute of a given ThoughtId into an object that can be passed to React styles. Returns null if there are no styles. */
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
