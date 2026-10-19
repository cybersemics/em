import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getAllChildren } from '../selectors/getChildren'
import isAttribute from '../util/isAttribute'
import getThoughtById from './getThoughtById'

/** Finds a descendant by value, choosing the first matching sibling in canonical order. */
const findDescendant = (state: State, thoughtId: ThoughtId | null, values: string | string[]): ThoughtId | null => {
  if (!thoughtId || values.length === 0) return thoughtId
  if (!Array.isArray(values)) values = [values]
  // Reuse the transaction-consistent membership index for attributes instead of reading every sibling.
  // Memberships are normalized, so exact text and canonical sibling order still decide the match.
  const memberships = isAttribute(values[0]) ? (state.thoughts.getLexeme(values[0]) ?? []) : null
  if (memberships?.length === 0) return null
  const children = getAllChildren(state, thoughtId)
  const candidates = memberships && memberships.length < children.length ? new Set(memberships) : null
  const child = children.find(
    id => (!candidates || candidates.has(id)) && getThoughtById(state, id)?.value === values[0],
  )
  return child ? findDescendant(state, child, values.slice(1)) : null
}

export default findDescendant
