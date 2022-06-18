// import * as murmurHash3 from 'murmurhash3js'
// import globals from '../globals'
import { EM_TOKEN } from '../constants'
import { Context, Index, Thought, State, ThoughtId } from '../@types'
import { isRoot } from '../util'
import { childIdsToThoughts, getThoughtById } from '../selectors'

/** DEPRECATED. Recursively finds the thought represented by the context and returns the id. This is the part of the independent migration strategy. Will likely be changed to some other name later. If more than one thought has the same value in the same context, traveerses the first. */
const contextToThoughtId = (state: State, thoughts: Context, rank?: number): ThoughtId | null => {
  if (isRoot(thoughts)) return thoughts[0] as ThoughtId

  const startsWithEM = thoughts[0] === EM_TOKEN
  const rootThought = getThoughtById(state, startsWithEM ? EM_TOKEN : (state.rootContext[0] as ThoughtId))

  if (!rootThought) {
    console.error(
      'hashContext: Parent entry for root context not found',
      startsWithEM ? EM_TOKEN : state.rootContext[0],
    )
    return null
  }

  if (startsWithEM && thoughts.length === 1) return rootThought.id

  const thought = recursiveThoughtFinder(state, rootThought, startsWithEM ? thoughts.slice(1) : thoughts)
  return thought?.id || null
}

/**
 * Recursively finds the thought for the given context.
 */
const recursiveThoughtFinder = (
  state: State,
  thought: Thought,
  target: Context,
  targetIndex = 0,
  visitedIds: Index<boolean> = {}, // keyed by ThoughtId
): Thought | null => {
  if (target.length === 0 && Object.values(thought.childrenMap).length === 0) return null

  const children = childIdsToThoughts(state, Object.values(thought.childrenMap))
  const child = children.find(child => target[targetIndex] === child.value)

  if (!child) return null

  if (visitedIds[child.id]) {
    console.warn('circular context found!', target, child)
    return null
  }

  const nextThought = getThoughtById(state, child.id)

  if (!nextThought) {
    console.warn('Parent entry for the child not found!', child)
    return null
  }

  if (targetIndex === target.length - 1) return nextThought

  return recursiveThoughtFinder(state, nextThought, target, targetIndex + 1, {
    ...visitedIds,
    [child.id]: true,
  })
}

export default contextToThoughtId
