// eslint-disable-next-line no-unused-vars
import { Context } from '../types'

// util
import { hashContext } from '../util/hashContext.js'

/** Returns the subthoughts of the given context unordered. */
const getThoughts = ({ thoughts: { contextIndex, thoughtIndex } }: any, context: Context) =>
  contextIndex[hashContext(context)] || []

export default getThoughts
