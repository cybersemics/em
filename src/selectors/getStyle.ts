import _ from 'lodash'
import getThoughts from '../selectors/getThoughts'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Parses the =style attribute of a given context into an object that can be passed to React styles. */
const getStyle = (state: State, context: Context, { container }: { container?: boolean } = {}) => {

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
