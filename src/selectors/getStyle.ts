import _ from 'lodash'
import { pathToContext } from '../util'
import getThoughts from '../selectors/getThoughts'
import { State } from '../util/initialState'
import { Context, Path } from '../types'

/** Parses the =style attribute of a given context into an object that can be passed to React styles. */
const getStyle = (state: State, pathOrContext: Path | Context, { container }: { container?: boolean } = {}) => {

  const context = pathToContext(pathOrContext)
  const styleContext = [...context, container ? '=styleContainer' : '=style']
  const children = getThoughts(state, styleContext)

  return children.reduce((accum, { value }) => {
    const styleValueThought = getThoughts(state, [...styleContext, value])[0]
    return {
      ...accum,
      ...styleValueThought
        ? {
          [_.camelCase(value)]: styleValueThought.value
        }
        : null

    }
  }, {})
}

export default getStyle
