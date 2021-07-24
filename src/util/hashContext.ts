// import * as murmurHash3 from 'murmurhash3js'
// import globals from '../globals'
import { EM_TOKEN } from '../constants'

// util
// import { escapeSelector } from './escapeSelector'
import { Context, Parent, State } from '../@types'
// import { normalizeThought } from './normalizeThought'
// import { getAllChildren } from '../selectors'
import { isRoot } from './isRoot'

// const SEPARATOR_TOKEN = '__SEP__'

/** Encode the thoughts (and optionally rank) as a string. */
// export const hashContext = (thoughts: Context, rank?: number): ContextHash =>
//   (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(
//     thoughts.map(thought => (thought ? escapeSelector(normalizeThought(thought)) : '')).join(SEPARATOR_TOKEN) +
//       (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : ''),
//   ) as ContextHash

/** Encode the thoughts (and optionally rank) as a string. */
export const hashContext = (state: State, thoughts: Context, rank?: number): string | null => {
  const root = isRoot(thoughts)
  if (root) return thoughts[0]

  const startsWithEM = thoughts[0] === EM_TOKEN
  const rootParent = state.thoughts.contextIndex[startsWithEM ? EM_TOKEN : state.rootContext[0]]
  const parent = recursiveParentFinder(state, rootParent, startsWithEM ? thoughts.slice(1) : thoughts)
  return parent?.id || null
}

/**
 *
 */
const recursiveParentFinder = (
  state: State,
  parent: Parent,
  target: Context,
  targetIndex = 0,
  visitedId: string[] = [],
): Parent | null => {
  if (target.length === 0 && parent.children.length === 0) return null

  const child = parent.children.find(child => target[targetIndex] === child.value)

  if (!child) return null
  const isCircular = visitedId.includes(child.id)

  if (isCircular) {
    console.warn('circular context found!', target, child)
    return null
  }

  const nextParent = state.thoughts.contextIndex[child.id]

  if (!nextParent) {
    console.warn('Parent entry for the child not found!', child)
    return null
  }

  if (targetIndex === target.length - 1) {
    console.log(nextParent, target, 'Found!')
    return nextParent
  }

  return recursiveParentFinder(state, nextParent, target, targetIndex + 1, [...visitedId, child.id])
}
