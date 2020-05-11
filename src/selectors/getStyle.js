import _ from 'lodash'

// util
import {
  pathToContext,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

/** Parses the =style attribute of a given context into an object that can be passed to React styles */
const getStyle = (state, pathOrContext, { container } = {}) => {

  const context = pathToContext(pathOrContext)
  const styleContext = context.concat(container ? '=styleContainer' : '=style')
  const children = getThoughts(state, styleContext)

  return children.reduce((accum, { value } = {}) => {
    const styleValueThought = getThoughts(state, styleContext.concat(value))[0]
    return {
      ...accum,
      ...(styleValueThought
        ? {
          [_.camelCase(value)]: styleValueThought.value
        }
        : null
      )
    }
  }, {})
}

export default getStyle
