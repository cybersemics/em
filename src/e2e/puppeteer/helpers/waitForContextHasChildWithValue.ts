import Context from '../../../@types/Context'
import Thought from '../../../@types/Thought'
import { page } from '../session'

/**
 * Wait until given context has a child with given value.
 */
const waitForContextHasChildWithValue = async (context: Context, childValue: string) =>
  page.waitForFunction(
    (context: Context, childValue: string) =>
      window.em.getAllChildrenAsThoughts(context).some((thought: Thought) => thought.value === childValue) &&
      window.em.getLexeme(childValue),
    {},
    context,
    childValue,
  )

export default waitForContextHasChildWithValue
