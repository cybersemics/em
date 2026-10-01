import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceView from '../@types/ThoughtspaceView'
import { findAnyChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isAttribute from '../util/isAttribute'

// Attribute lookup depends on child payloads as well as order, so each immutable view owns its cache.
const attributes = new WeakMap<ThoughtspaceView, Map<ThoughtId, Map<string, ThoughtId>>>()

/** Finds a descendant by value, choosing the first matching sibling in canonical order. */
const findDescendant = (state: State, thoughtId: ThoughtId | null, values: string | string[]): ThoughtId | null => {
  if (!thoughtId || values.length === 0) return thoughtId
  if (!Array.isArray(values)) values = [values]
  if (isAttribute(values[0])) {
    const cache = attributes.get(state.thoughts) ?? new Map<ThoughtId, Map<string, ThoughtId>>()
    attributes.set(state.thoughts, cache)
    if (!cache.has(thoughtId)) {
      const children = new Map<string, ThoughtId>()
      state.thoughts.getChildren(thoughtId).forEach(id => {
        const child = getThoughtById(state, id)
        if (child && isAttribute(child.value) && !children.has(child.value)) children.set(child.value, id)
      })
      cache.set(thoughtId, children)
    }
    const id = cache.get(thoughtId)!.get(values[0])
    return id ? findDescendant(state, id, values.slice(1)) : null
  }
  const child = findAnyChild(state, thoughtId, child => child.value === values[0])
  return child ? findDescendant(state, child.id, values.slice(1)) : null
}

export default findDescendant
