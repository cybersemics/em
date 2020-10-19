import { State } from '../util/initialState'
import { Child, ContextHash } from '../types'

/** Returns the thoughts for the context that has already been encoded (such as Firebase keys). */
const getThoughtsOfEncodedContext = ({ thoughts: { contextIndex } }: State, contextEncoded: ContextHash): Child[] =>
  ((contextIndex || {})[contextEncoded] || {}).children || []

export default getThoughtsOfEncodedContext
