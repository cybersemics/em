import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtReaderState from '../@types/ThoughtReaderState'
import { EM_TOKEN } from '../constants'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import { getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isRoot from '../util/isRoot'

/**
 * Recursively finds the thought for the given context.
 */
const recursiveThoughtFinder = (
  state: ThoughtReaderState,
  thought: Thought,
  target: Context,
  targetIndex = 0,
  visitedIds: Index<boolean> = {}, // keyed by ThoughtId
): Thought | null => {
  const children = childIdsToThoughts(state, getAllChildren(state, thought.id))
  if (target.length === 0 && children.length === 0) return null
  const child = children.find(child => target[targetIndex] === child.value)

  if (!child) return null

  if (visitedIds[child.id]) {
    console.warn('circular context found!', target, child)
    return null
  }

  const nextThought = getThoughtById(state, child.id)

  if (!nextThought) {
    console.warn('Thought for child not found', child)
    return null
  }

  if (targetIndex === target.length - 1) return nextThought

  return recursiveThoughtFinder(state, nextThought, target, targetIndex + 1, {
    ...visitedIds,
    [child.id]: true,
  })
}
/** DEPRECATED. Recursively finds the thought represented by the context and returns the id. This is the part of the independent migration strategy. Will likely be changed to some other name later. If more than one thought has the same value in the same context, traveerses the first. */
const contextToThoughtId = (state: ThoughtReaderState, thoughts: Context): ThoughtId | null => {
  if (isRoot(thoughts)) return thoughts[0] as ThoughtId

  const startsWithEM = thoughts[0] === EM_TOKEN
  const rootThought = getThoughtById(state, startsWithEM ? EM_TOKEN : (state.rootContext[0] as ThoughtId))

  if (!rootThought) {
    console.error('hashContext: Thought for root context not found', startsWithEM ? EM_TOKEN : state.rootContext[0])
    return null
  }

  if (startsWithEM && thoughts.length === 1) return rootThought.id

  const thought = recursiveThoughtFinder(state, rootThought, startsWithEM ? thoughts.slice(1) : thoughts)
  return thought?.id || null
}

export default contextToThoughtId
