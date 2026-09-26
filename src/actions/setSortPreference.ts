import SimplePath from '../@types/SimplePath'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'
import alert from './alert'
import deleteAttribute from './deleteAttribute'
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
  transaction?: ThoughtspaceTransaction,
): State => {
  const id = head(simplePath)
  const currentSortPreference = getSortPreference(state, id)

  return reducerFlow([
    // alert
    showAlert
      ? alert({
          value:
            'Sort ' +
            (sortPreference.type !== 'None'
              ? `${sortPreference.direction === 'Asc' ? 'ascending' : 'descending'}`
              : 'manually'),
        })
      : null,

    // Setting the sort preference to None removes the sort attribute and restores the manual sort order.
    sortPreference.type === 'None'
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

            const children = getAllChildrenAsThoughts(state, id).sort(
              (a, b) => (manualRanks[a.id] ?? a.rank) - (manualRanks[b.id] ?? b.rank),
            )
            return updateThoughts(
              state,
              {
                thoughtIndexUpdates: keyValueBy(children, child => ({ [child.id]: child })),
                movePlacements: Object.fromEntries(
                  children.map((child, index) => [child.id, children[index - 1]?.id ?? null]),
                ),
                preventExpandThoughts: true,
              },
              transaction,
            )
          },
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
          sortPreference.type !== currentSortPreference.type
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

            if (!sortPreference.direction) {
              // Remove direction if it's null
              return toggleAttribute(
                state,
                {
                  path: pathSort,
                  values: [sortPreference.type],
                },
                transaction,
              )
            } else {
              // Set specified direction
              return toggleAttribute(
                state,
                {
                  path: pathSort,
                  values: [sortPreference.type, sortPreference.direction],
                },
                transaction,
              )
            }
          },

          // Apply the sort
          sort(id),
        ]),
  ])(state, transaction)
}

/** Action-creator for setSortPreference. */
export const setSortPreferenceActionCreator =
  (payload: Parameters<typeof setSortPreference>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setSortPreference', ...payload })

export default command(setSortPreference)

// Register this action's metadata
registerActionMetadata('setSortPreference', {
  undoable: true,
})
