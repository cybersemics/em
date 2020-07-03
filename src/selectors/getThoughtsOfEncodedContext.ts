import { Child } from '../types'
import { State } from '../util/initialState'

/** Returns the thoughts for the context that has already been encoded (such as Firebase keys). */
const getThoughtsOfEncodedContext = ({ thoughts: { contextIndex } }: State, contextEncoded: string): Child[] =>
  ((contextIndex || {})[contextEncoded] || {}).children || []

export default getThoughtsOfEncodedContext
