import _ from 'lodash'
import { getAllChildren, rankThoughtsFirstMatch } from '../selectors'
import { hashThought, head, headValue, unroot } from '../util'
import { resolveArray, resolvePath, resolveShallow } from '../util/memoizeResolvers'
import { Child, SimplePath, State, ThoughtContext } from '../@types'
import getParentThought from './getParentThought'
import getContextForThought from './getContextForThought'

/** A memoize resolver that handles child and simplePath value equality for getChildPath. */
const resolve = (state: State, child: Child | ThoughtContext, simplePath: SimplePath, showContexts?: boolean) =>
  resolveArray([
    // slow, but ensures getChildPath doesn't get memoized when children change
    showContexts && getParentThought(state, (child as ThoughtContext).id)!.value
      ? resolvePath(getAllChildren(state, getContextForThought(state, (child as ThoughtContext).id)!))
      : '',
    resolveShallow(child),
    resolvePath(simplePath),
    showContexts,
  ])

/** Because the current thought only needs to hash match another thought we need to use the exact value of the child from the other context child.context SHOULD always be defined when showContexts is true. */
const getChildPath = _.memoize(
  (state: State, child: Child | ThoughtContext, simplePath: SimplePath, showContexts?: boolean): SimplePath => {
    const otherSubthought =
      (showContexts && getParentThought(state, (child as ThoughtContext).id)!.value
        ? getAllChildren(state, getContextForThought(state, (child as ThoughtContext).id)!)
        : []
      ).find(child => hashThought(child.value) === hashThought(headValue(simplePath))) || head(simplePath)

    const childPath = (
      showContexts
        ? // rankThoughtsFirstMatch not accounted for by memoize resolver
          rankThoughtsFirstMatch(state, getContextForThought(state, (child as ThoughtContext).id)!).concat(
            otherSubthought,
          )
        : unroot(simplePath).concat(child as Child)
    ) as SimplePath

    return childPath
  },
  resolve,
)

export default getChildPath
