import { sortBy } from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import getSiblingPaths from '../selectors/getSiblingPaths'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'
import reducerFlow from '../util/reducerFlow'
import addMulticursor from './addMulticursor'
import setCursor from './setCursor'
import toggleMulticursor from './toggleMulticursor'

/** Selects all thoughts between two selected thoughts, or between the active anchor and a new endpoint. */
const selectBetween = (state: State, payload?: { path?: Path }): State => {
  const { cursor } = state
  const multicursorPaths = Object.values(state.multicursors)
  const path = payload?.path
  // The last individually selected thought starts a range. Once active, the original anchor remains fixed.
  const anchor = path ? (state.multicursorAnchor ?? multicursorPaths.at(-1) ?? null) : null
  const endpointPaths = path && anchor ? [anchor, path] : multicursorPaths

  // Match the existing Shift-click behavior by starting the multiselect at the clicked thought.
  if (path && !anchor) {
    return reducerFlow([setCursor({ path, preserveMulticursor: true }), toggleMulticursor({ path })])(state)
  }

  if (endpointPaths.length === 1) {
    return alert(state, { value: 'Select Between requires at least two selected thoughts.' })
  }

  const cursorSiblingPaths = getSiblingPaths(state, path ?? cursor)
  const cursorSiblingIndex = new Map(cursorSiblingPaths.map((path, i) => [hashPath(path), i]))

  // verify that all selected paths are at the same level
  if (endpointPaths.length > 0 && !endpointPaths.every(path => cursorSiblingIndex.has(hashPath(path)))) {
    return alert(state, { value: 'Select Between only works when the selected thoughts are at the same level.' })
  }

  const multicursorPathsSorted = sortBy(endpointPaths, path => cursorSiblingIndex.get(hashPath(path)) ?? -1)

  // find the first and last selected paths, defaulting to the first and last cursor siblings
  const firstPath = multicursorPathsSorted.at(0) ?? cursorSiblingPaths.at(0)
  const lastPath = multicursorPathsSorted.at(-1) ?? cursorSiblingPaths.at(-1)

  if (!firstPath || !lastPath) {
    return alert(state, { value: 'Select Between requires two selected thoughts.' })
  }

  const firstIndex = cursorSiblingIndex.get(hashPath(firstPath))
  const lastIndex = cursorSiblingIndex.get(hashPath(lastPath))

  if (firstIndex === undefined || lastIndex === undefined) {
    return alert(state, { value: 'Select Between only works when the selected thoughts are at the same level.' })
  }

  const startIndex = Math.min(firstIndex, lastIndex)
  const endIndex = Math.max(firstIndex, lastIndex)

  // add every path between the first and last selected paths to the multicursor
  const pathsToAdd = cursorSiblingPaths.slice(startIndex, endIndex + 1)
  // Endpoint adjustment replaces only the active range, preserving independent selections and committed ranges.
  const committedMulticursors = path
    ? Object.fromEntries(Object.entries(state.multicursors).filter(([key]) => !state.multicursorRange[key]))
    : state.multicursors
  const stateRangeCleared = path ? { ...state, multicursors: committedMulticursors } : state
  const stateNew = reducerFlow([
    ...(path ? [setCursor({ path, preserveMulticursor: true })] : []),
    ...pathsToAdd.map(path => addMulticursor({ path })),
  ])(stateRangeCleared)
  // Direct endpoint selection preserves an existing anchor. The Select Between command establishes the first
  // selected thought as the anchor only when it was activated from explicit endpoints, not its select-all fallback.
  const rangeAnchor = path ? anchor : multicursorPaths.length >= 2 ? multicursorPaths.at(0)! : null
  const rangePaths = path
    ? pathsToAdd.filter(path => !committedMulticursors[hashPath(path)])
    : rangeAnchor
      ? pathsToAdd.filter(path => hashPath(path) !== hashPath(rangeAnchor))
      : []
  const multicursorRange = Object.fromEntries(rangePaths.map(path => [hashPath(path), path]))

  return { ...stateNew, multicursorAnchor: rangeAnchor, multicursorRange }
}

/** Action-creator for selectBetween. */
export const selectBetweenActionCreator =
  (payload?: Parameters<typeof selectBetween>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'selectBetween', ...payload })

export default selectBetween

// Register this action's metadata
registerActionMetadata('selectBetween', {
  undoable: false,
})
