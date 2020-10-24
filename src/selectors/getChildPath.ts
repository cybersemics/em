import { getAllChildren, rankThoughtsFirstMatch } from '../selectors'
import { hashThought, head, headValue, unroot } from '../util'
import { State } from '../util/initialState'
import { Child, SimplePath, ThoughtContext } from '../types'

/** Because the current thought only needs to hash match another thought we need to use the exact value of the child from the other context child.context SHOULD always be defined when showContexts is true. */
const getChildPath = (state: State, child: Child | ThoughtContext, simplePath: SimplePath, showContexts?: boolean): SimplePath => {

  const otherSubthought = (showContexts && (child as ThoughtContext).context ? getAllChildren(state, (child as ThoughtContext).context) : [])
    .find(child => hashThought(child.value) === hashThought(headValue(simplePath)))
    || head(simplePath)

  const childPath = (showContexts
    ? rankThoughtsFirstMatch(state, (child as ThoughtContext).context).concat(otherSubthought)
    : unroot(simplePath).concat(child as Child)) as SimplePath

  return childPath
}

export default getChildPath
