import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { compareReasonable, compareReasonableDescending } from '../util/compareThought'
import isAttribute from '../util/isAttribute'
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
    const firstVisible = children.findIndex(child => !isAttribute(child.value))
    return (descending && firstVisible !== -1 ? children[firstVisible - 1] : children.at(-1))?.id ?? null
  }
  const compare = descending ? compareReasonableDescending : compareReasonable
  const candidates = type === 'Note' ? children.filter(isVisible(state)) : children
  const index = candidates.findIndex(child =>
    type === 'Created' && created !== undefined
      ? descending
        ? child.created <= created
        : child.created > created
      : type === 'Note'
        ? compare(noteValue(state, thoughtToPath(state, child.id)) ?? '', value) !== -1
        : compare(child.value, value) !== -1,
  )
  // Ascending creation ties append after existing siblings, preserving sequential splits in the same millisecond.
  return index === -1
    ? (candidates.at(-1)?.id ?? null)
    : (siblings[siblings.findIndex(child => child.id === candidates[index].id) - 1]?.id ?? null)
}

export default getSortedPlacement
