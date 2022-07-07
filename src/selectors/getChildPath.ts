import _ from 'lodash'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import contextToPath from '../selectors/contextToPath'
import { getAllChildren, getAllChildrenAsThoughts } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import { resolveArray, resolvePath } from '../util/memoizeResolvers'
import normalizeThought from '../util/normalizeThought'
import unroot from '../util/unroot'
import parentOfThought from './parentOfThought'
import thoughtToContext from './thoughtToContext'

/** A memoize resolver that handles child and simplePath value equality for getChildPath. */
const resolve = (state: State, childId: ThoughtId | ThoughtContext, simplePath: SimplePath, showContexts?: boolean) =>
  resolveArray([
    // slow, but ensures getChildPath doesn't get memoized when children change
    showContexts && parentOfThought(state, childId)!.value ? resolvePath(getAllChildren(state, childId)) : '',
    childId,
    resolvePath(simplePath),
    showContexts,
  ])

/** Because the current thought only needs to hash match another thought we need to use the exact value of the child from the other context child.context SHOULD always be defined when showContexts is true. */
const getChildPath = _.memoize(
  (state: State, child: ThoughtId | ThoughtContext, simplePath: SimplePath, showContexts?: boolean): SimplePath => {
    const simplePathHeadThought = getThoughtById(state, head(simplePath))
    const otherSubthought = (
      showContexts && parentOfThought(state, child)!.id ? getAllChildrenAsThoughts(state, child) : []
    ).find(child => normalizeThought(child.value) === normalizeThought(simplePathHeadThought.value))?.id

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
