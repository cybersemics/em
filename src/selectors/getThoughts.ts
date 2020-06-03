import { Context } from '../types'
import { PartialStateWithThoughts } from '../util/initialState'
import { hashContext } from '../util/hashContext'

/** Returns the subthoughts of the given context unordered. */
const getThoughts = ({ thoughts: { contextIndex } }: PartialStateWithThoughts, context: Context) =>
  (contextIndex || {})[hashContext(context)] || []

export default getThoughts
