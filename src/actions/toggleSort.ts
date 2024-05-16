import _ from 'lodash'
import SimplePath from '../@types/SimplePath'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getGlobalSortPreference from '../selectors/getGlobalSortPreference'
import getSortPreference from '../selectors/getSortPreference'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'
import alert from './alert'
import deleteAttribute from './deleteAttribute'
import rerank from './rerank'
import sort from './sort'
import toggleAttribute from './toggleAttribute'
import updateThoughts from './updateThoughts'

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
        reducerFlow([
          deleteAttribute({
            path: simplePath,
            value: '=sort',
          }),
          // restore manual ranks
          // See: State.manualSortMap
          state => {
            const manualRanks = state.manualSortMap[id]
            if (!manualRanks) return state

            // get all children with manual ranks that still exist
            const childrenWithManualRanks = getAllChildrenAsThoughts(state, id).filter(child => child.id in manualRanks)
            return updateThoughts(state, {
              thoughtIndexUpdates: keyValueBy(childrenWithManualRanks, child => ({
                [child.id]: {
                  ...child,
                  rank: manualRanks[child.id],
                },
              })),
              lexemeIndexUpdates: {},
              preventExpandThoughts: true,
            })
          },
          // rerank in case there are any duplicate ranks
          rerank(simplePath),
        ])
      : // Toggle on/change
        reducerFlow([
          // When sorting the context for the first time, store the manual sort order so it can be restored when cycling off.
          // See: State.manualSortMap
          currentSortPreference.type === 'None'
            ? state => ({
                ...state,
                manualSortMap: {
                  ...state.manualSortMap,
                  [id]: keyValueBy(getAllChildrenAsThoughts(state, id), child => ({ [child.id]: child.rank })),
                },
              })
            : null,

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
          sort(id),
        ]),
  ])(state)
}

/** Action-creator for toggleSort. */
export const toggleSortActionCreator =
  (payload: Parameters<typeof toggleSort>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleSort', ...payload })

export default _.curryRight(toggleSort, 2)
