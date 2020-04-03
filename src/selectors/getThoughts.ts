import { Context } from '../types'
import { store } from '../store'

// util
import { hashContext } from '../util/hashContext.js'


/** Returns the subthoughts of the given context unordered. */
const getThoughts = ({ contextIndex, thoughtIndex }: any, context: Context) =>
  contextIndex[hashContext(context)] || []

export default getThoughts
