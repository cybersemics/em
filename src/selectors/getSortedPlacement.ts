import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { compareReasonable, compareReasonableDescending } from '../util/compareThought'
import { getChildrenRanked, getSortComparator, isVisible } from './getChildren'
import getSortPreference from './getSortPreference'
import noteValue from './noteValue'
import thoughtToPath from './thoughtToPath'

/** Finds the preceding sibling for a sort key, without converting the position through a numeric rank. */
const getSortedPlacement = (
  state: State,
  id: ThoughtId,
  value: string,
  { created, staleId }: { created?: number; staleId?: ThoughtId } = {},
): ThoughtId | null => {
  // Remove the old value before sorting: an empty placeholder's rank fallback can otherwise skew the comparator order.
  const siblings = getChildrenRanked(state, id).filter(child => child.id !== staleId)
  const comparator = getSortComparator(state, id)
  const children = comparator ? [...siblings].sort(comparator) : siblings
  const { type, direction } = getSortPreference(state, id)
  const descending = direction === 'Desc'
  if (type === 'Updated') {
    // Updated sorting compares attribute timestamps too, so a newly updated thought precedes every sibling in Desc.
    return descending ? null : (children.at(-1)?.id ?? null)
  }
  // Note sorting reverses the comparator exactly; unlike Alphabetical, formatted notes do not stay first in Desc.
  const compare = descending
    ? type === 'Note'
      ? (a: string, b: string) => compareReasonable(b, a)
      : compareReasonableDescending
    : compareReasonable
  const candidates = type === 'Note' ? children.filter(isVisible(state)) : children
  const index = candidates.findIndex(child => {
    if (type === 'Note') {
      const note = noteValue(state, thoughtToPath(state, child.id))
      // Notes sort before absent or empty notes in either direction.
      return !note || (!!value && compare(note, value) !== -1)
    }
    return type === 'Created' && created !== undefined
      ? descending
        ? child.created <= created
        : child.created > created
      : compare(child.value, value) !== -1
  })
  // Ascending creation ties append after existing siblings, preserving sequential splits in the same millisecond.
  return index === -1
    ? (candidates.at(-1)?.id ?? null)
    : (siblings[siblings.findIndex(child => child.id === candidates[index].id) - 1]?.id ?? null)
}

export default getSortedPlacement
