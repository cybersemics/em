import { Context, State } from '../@types'
import { getAllChildren } from '../selectors'
import { contextToThoughtId } from '../util'

const getAllChildrenByContext = (state: State, context: Context) =>
  getAllChildren(state, contextToThoughtId(state, context))

export default getAllChildrenByContext
