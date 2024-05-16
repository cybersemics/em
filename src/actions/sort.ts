import _ from 'lodash'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getAllChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import keyValueBy from '../util/keyValueBy'
import updateThoughts from './updateThoughts'

/** Sorts a context. If no sort preference is provided, sorts by its =sort attribute. */
const sort = (state: State, id: ThoughtId, sortPreference?: SortPreference): State => {
  sortPreference = sortPreference || getSortPreference(state, id)
  if (sortPreference?.type === 'None') return state

  const children = getAllChildrenSorted(state, id)
  return updateThoughts(state, {
    thoughtIndexUpdates: keyValueBy(children, (child, i) => ({
      [child.id]: {
        ...child,
        rank: i,
      },
    })),
    lexemeIndexUpdates: {},
    preventExpandThoughts: true,
  })
}

export default _.curryRight(sort, 2)
