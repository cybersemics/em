// import * as murmurHash3 from 'murmurhash3js'
// import globals from '../globals'
import { EM_TOKEN } from '../constants'

// util
// import { escapeSelector } from './escapeSelector'
import { Context, Parent, State, ThoughtId } from '../@types'
// import { normalizeThought } from './normalizeThought'
// import { getAllChildren } from '../selectors'
import { isRoot } from '.'
import { normalizeThought } from './normalizeThought'
import { childIdsToThoughts, getThoughtById } from '../selectors'

// const SEPARATOR_TOKEN = '__SEP__'

/** Encode the thoughts (and optionally rank) as a string. */
// export const hashContext = (thoughts: Context, rank?: number): ContextHash =>
//   (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(
//     thoughts.map(thought => (thought ? escapeSelector(normalizeThought(thought)) : '')).join(SEPARATOR_TOKEN) +
//       (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : ''),
//   ) as ContextHash

/** Recursively finds the thought represented by the context and returns the id. This is the part of the independent migration strategy. Will likely be changed to some other name later. */
export const getThoughtIdByContext = (state: State, thoughts: Context, rank?: number): ThoughtId | null => {
  const root = isRoot(thoughts)
  if (root) return thoughts[0] as ThoughtId

  const startsWithEM = thoughts[0] === EM_TOKEN
  const rootParent = getThoughtById(state, startsWithEM ? EM_TOKEN : (state.rootContext[0] as ThoughtId))

  if (!rootParent) {
    console.error(
      'hashContext: Parent entry for root context not found',
      startsWithEM ? EM_TOKEN : state.rootContext[0],
    )
    return null
  }

  if (startsWithEM && thoughts.length === 1) return rootParent.id

  const parent = recursiveParentFinder(state, rootParent, startsWithEM ? thoughts.slice(1) : thoughts)
  return parent?.id || null
}

/**
 * Recursively finds the thought for the given context.
 */
const recursiveParentFinder = (
  state: State,
  parent: Parent,
  target: Context,
  targetIndex = 0,
  visitedId: string[] = [],
): Parent | null => {
  if (target.length === 0 && parent.children.length === 0) return null

  const children = childIdsToThoughts(state, parent.children) ?? []

  if (parent.children.length > children.length) return null

  const child = children.find(child => {
    const targetValue = target[targetIndex]
    return targetValue !== undefined && normalizeThought(target[targetIndex]) === normalizeThought(child.value)
  })

  if (!child) return null
  const isCircular = visitedId.includes(child.id)

  if (isCircular) {
    console.warn('circular context found!', target, child)
    return null
  }

  const nextParent = getThoughtById(state, child.id)

  if (!nextParent) {
    console.warn('Parent entry for the child not found!', child)
    return null
  }

  if (targetIndex === target.length - 1) return nextParent

  return recursiveParentFinder(state, nextParent, target, targetIndex + 1, [...visitedId, child.id])
}
