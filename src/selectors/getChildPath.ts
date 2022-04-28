import _ from 'lodash'
import { getAllChildren, getThoughtById, contextToPath } from '../selectors'
import { hashThought, head, unroot } from '../util'
import { resolveArray, resolvePath } from '../util/memoizeResolvers'
import { ThoughtId, SimplePath, State, ThoughtContext } from '../@types'
import parentOfThought from './parentOfThought'
import thoughtToContext from './thoughtToContext'
import { getAllChildrenAsThoughts } from './getChildren'

/** A memoize resolver that handles child and simplePath value equality for getChildPath. */
const resolve = (state: State, child: ThoughtId | ThoughtContext, simplePath: SimplePath, showContexts?: boolean) =>
  resolveArray([
    // slow, but ensures getChildPath doesn't get memoized when children change
    showContexts && parentOfThought(state, child)!.value
      ? resolvePath(getAllChildren(state, thoughtToContext(state, child)!))
      : '',
    child,
    resolvePath(simplePath),
    showContexts,
  ])

/** Because the current thought only needs to hash match another thought we need to use the exact value of the child from the other context child.context SHOULD always be defined when showContexts is true. */
const getChildPath = _.memoize(
  (state: State, child: ThoughtId | ThoughtContext, simplePath: SimplePath, showContexts?: boolean): SimplePath => {
    const simplePathHeadThought = getThoughtById(state, head(simplePath))
    const otherSubthought = (
      showContexts && parentOfThought(state, child)!.id
        ? getAllChildrenAsThoughts(state, thoughtToContext(state, child)!)
        : []
    ).find(child => hashThought(child.value) === hashThought(simplePathHeadThought.value))?.id

    const path = showContexts && contextToPath(state, thoughtToContext(state, child)!)
    const childPath = (
      showContexts && path
        ? // contextToPath not accounted for by memoize resolver
          path.concat(otherSubthought!)
        : unroot(simplePath).concat(child as ThoughtId)
    ) as SimplePath

    return childPath
  },
  resolve,
)

export default getChildPath
