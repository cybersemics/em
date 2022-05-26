import { Context, State } from '../@types'
import { getAllChildrenById } from '../selectors'
import { contextToThoughtId } from '../util'

const getAllChildrenByContext = (state: State, context: Context) =>
  getAllChildrenById(state, contextToThoughtId(state, context))

export default getAllChildrenByContext
