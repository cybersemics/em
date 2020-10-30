import { Context } from '../types'
import { State } from '../util/initialState'
import { hashContext } from '../util'

/** Returns true if the context has not been loaded form the remote yet. */
const isPending = ({ thoughts: { contextIndex } }: State, context: Context) =>
  !!((contextIndex || {})[hashContext(context)] || {}).pending

export default isPending
