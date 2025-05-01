import _ from 'lodash'
import SimplePath from '../@types/SimplePath'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getGlobalSortPreference from '../selectors/getGlobalSortPreference'
import getSortPreference from '../selectors/getSortPreference'
import { registerActionMetadata } from '../util/actionMetadata.registry'
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

/**
 * Sets a specific sort preference on a context and resorts it.
 * Unlike toggleSort which cycles through preferences, this directly sets to a specific preference.
 */
const setSortPreference = (
  state: State,
  {
    showAlert,
    simplePath,
    sortPreference,
  }: {
    showAlert?: boolean
    simplePath: SimplePath
    sortPreference: SortPreference
  },
): State => {
  const id = head(simplePath)
  const currentSortPreference = getSortPreference(state, id)
  const globalSortPreference = getGlobalSortPreference(state)

  return reducerFlow([
    // alert
    showAlert
      ? alert({
          value:
            'Sort ' +
            (sortPreference.type !== 'None'
              ? `${sortPreference.direction === 'Asc' ? 'ascending' : 'descending'}`
              : 'manually'),
          alertType: 'Sort',
        })
      : null,

    // If new sort preference equals global sort preference, delete the sort attribute
    globalSortPreference.type === sortPreference.type && globalSortPreference.direction === sortPreference.direction
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
      : // Set new preference
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

          // Set the =sort attribute with the new type
          sortPreference.type !== currentSortPreference.type || sortPreference.type === globalSortPreference.type
            ? reducerFlow([
                // toggleAttribute only overrides the existing attribute if the value is different. If the value is the same, it will remove the entire attribute.
                // So we delete the attribute first to avoid this behavior.
                deleteAttribute({
                  path: simplePath,
                  value: '=sort',
                }),
                toggleAttribute({
                  path: simplePath,
                  values: ['=sort', sortPreference.type],
                }),
              ])
            : null,

          // Handle direction changes
          state => {
            const sortId = findDescendant(state, id, '=sort')
            if (!sortId) return state

            const pathSort = unroot(appendToPath(simplePath, sortId))

            if (sortPreference.type === 'None') {
              // No direction for None
              return state
            } else if (!sortPreference.direction) {
              // Remove direction if it's null
              return toggleAttribute(state, {
                path: pathSort,
                values: [sortPreference.type],
              })
            } else {
              // Set specified direction
              return toggleAttribute(state, {
                path: pathSort,
                values: [sortPreference.type, sortPreference.direction],
              })
            }
          },

          // Apply the sort
          sort(id),
        ]),
  ])(state)
}

/** Action-creator for setSortPreference. */
export const setSortPreferenceActionCreator =
  (payload: Parameters<typeof setSortPreference>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setSortPreference', ...payload })

export default _.curryRight(setSortPreference, 2)

// Register this action's metadata
registerActionMetadata('setSortPreference', {
  undoable: false,
})
