import { CSSProperties } from 'react'
import _ from 'lodash'
import { Context, State } from '../@types'
import { keyValueBy } from '../util/keyValueBy'
import { getAllChildrenAsThoughts } from './getChildren'

/** Parses the =style attribute of a given context into an object that can be passed to React styles. Returns null if there are no styles. */
const getStyle = (
  state: State,
  context: Context,
  { container }: { container?: boolean } = {},
): CSSProperties | null => {
  const styleContext = [...context, container ? '=styleContainer' : '=style']
  const children = getAllChildrenAsThoughts(state, styleContext)

  const styles = keyValueBy(children, ({ value }) => {
    const styleValueThought = getAllChildrenAsThoughts(state, [...styleContext, value])[0]
    return styleValueThought ? { [_.camelCase(value)]: styleValueThought.value } : null
  })

  return Object.keys(styles).length > 0 ? styles : null
}

export default getStyle
