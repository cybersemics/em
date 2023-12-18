import _ from 'lodash'
import SimplePath from '../@types/SimplePath'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import findDescendant from '../selectors/findDescendant'
import getGlobalSortPreference from '../selectors/getGlobalSortPreference'
import getSortPreference from '../selectors/getSortPreference'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'
import alert from './alert'
import deleteAttribute from './deleteAttribute'
import sort from './sort'
import toggleAttribute from './toggleAttribute'

/* Available sort preferences */
const sortPreferences = ['None', 'Alphabetical']

/** Decide next sort preference.
  None → Alphabetical
  Alphabetical/Asc → Alphabetical/Desc
  Alphabetical/Desc → None.
 */
const decideNextSortPreference = (currentSortPreference: SortPreference): SortPreference => {
  if (currentSortPreference.direction === 'Asc') {
    return {
      type: currentSortPreference.type,
      direction: 'Desc',
    }
  } else {
    const nextSortPreferenceType =
      sortPreferences[(sortPreferences.indexOf(currentSortPreference.type) + 1) % sortPreferences.length]
    return {
      type: nextSortPreferenceType,
      direction: nextSortPreferenceType === 'None' ? null : 'Asc',
    }
  }
}

/** Toggles the sort setting on a context and resorts it. */
const toggleSort = (
  state: State,
  { showAlert, simplePath }: { showAlert?: boolean; simplePath: SimplePath },
): State => {
  const id = head(simplePath)
  const currentSortPreference = getSortPreference(state, id)
  const nextSortPreference = decideNextSortPreference(currentSortPreference)
  const globalSortPreference = getGlobalSortPreference(state)

  return reducerFlow([
    // alert
    showAlert
      ? alert({
          value:
            'Sort ' +
            (nextSortPreference.type !== 'None'
              ? `${nextSortPreference.direction === 'Asc' ? 'ascending' : 'descending'}`
              : 'manually'),
          alertType: 'Sort',
        })
      : null,

    // If next sort preference equals to global sort preference then the delete sort attribute.
    globalSortPreference.type === nextSortPreference.type &&
    globalSortPreference.direction === nextSortPreference.direction
      ? // Toggle off
        deleteAttribute({
          path: simplePath,
          value: '=sort',
        })
      : // Toggle on/change
        reducerFlow([
          // If next sort preference type does not equal to current sort then set =sort attribute.
          nextSortPreference.type !== currentSortPreference.type ||
          nextSortPreference.type === globalSortPreference.type
            ? toggleAttribute({
                path: simplePath,
                values: ['=sort', nextSortPreference.type],
              })
            : null,

          // If next preference type is not equal to current preference type, toggle new sort type.
          // We need to have this control to not remove the sort type when switching between Alphabetical/Asc and Alphabetical/Desc
          // if next sort preference direction is null, toggle off sort direction
          !nextSortPreference.direction && currentSortPreference.direction
            ? state => {
                const sortId = findDescendant(state, id, '=sort')
                const pathSort = unroot(appendToPath(simplePath, sortId!))
                return toggleAttribute(state, {
                  path: pathSort,
                  values: [
                    currentSortPreference.type,
                    ...(currentSortPreference.direction ? [currentSortPreference.direction] : []),
                  ],
                })
              }
            : null,

          // if next sort preference direction is not null, toggle direction
          nextSortPreference.direction
            ? state => {
                // use fresh state to pick up new =sort (if statement above)
                const sortId = findDescendant(state, id, '=sort')
                const pathSort = unroot(appendToPath(simplePath, sortId!))
                return toggleAttribute(state, {
                  path: pathSort,
                  values: [
                    nextSortPreference.type,
                    ...(nextSortPreference.direction ? [nextSortPreference.direction] : []),
                  ],
                })
              }
            : null,
        ]),

    sort(id),
  ])(state)
}

export default _.curryRight(toggleSort, 2)
