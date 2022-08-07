import Path from '../@types/Path'
import Shortcut from '../@types/Shortcut'
import SortPreference from '../@types/SortPreference'
import alert from '../action-creators/alert'
import deleteAttribute from '../action-creators/deleteAttribute'
import toggleAttribute from '../action-creators/toggleAttribute'
import Icon from '../components/icons/Sort'
import { HOME_PATH } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getGlobalSortPreference from '../selectors/getGlobalSortPreference'
import getSortPreference from '../selectors/getSortPreference'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import unroot from '../util/unroot'

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

const toggleSortShortcut: Shortcut = {
  id: 'toggleSort',
  label: 'Toggle Sort',
  description: 'Sort the current context alphabetically.',
  keyboard: { key: 's', meta: true, alt: true },
  svg: Icon,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state

    const simplePath = cursor || HOME_PATH
    const id = head(simplePath)
    const currentSortPreference = getSortPreference(state, id)
    const globalSortPreference = getGlobalSortPreference(state)
    const nextSortPreference = decideNextSortPreference(currentSortPreference)

    // if the user used the keyboard to activate the shortcut, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const sortDirectionLabel = nextSortPreference.direction === 'Asc' ? 'ascending' : 'descending'
      dispatch(
        alert(nextSortPreference.direction ? `Sort ${sortDirectionLabel}` : 'Sort manually', { clearDelay: 2000 }),
      )
    }

    // If next sort preference equals to global sort preference then delete sort attribute.
    if (
      globalSortPreference.type === nextSortPreference.type &&
      globalSortPreference.direction === nextSortPreference.direction
    ) {
      dispatch(
        deleteAttribute({
          path: simplePath,
          key: '=sort',
        }),
      )
    }
    // If next preference type is not equal to current preference type, toggle new sort type.
    // We need to have this control to not remove the sort type when switching between Alphabetical/Asc and Alphabetical/Desc
    else {
      // if next sort preference direction is null, toggle off sort direction
      if (!nextSortPreference.direction && currentSortPreference.direction) {
        const sortId = findDescendant(state, id, '=sort')
        const pathSort = unroot([...simplePath, sortId] as Path)
        dispatch(
          toggleAttribute({
            path: pathSort!,
            values: [currentSortPreference.type, currentSortPreference.direction],
          }),
        )
      }

      // If next sort preference type does not equal to current sort then set =sort attribute.
      if (
        nextSortPreference.type !== currentSortPreference.type ||
        nextSortPreference.type === globalSortPreference.type
      ) {
        dispatch(
          toggleAttribute({
            path: simplePath,
            values: ['=sort', nextSortPreference.type],
          }),
        )
      }

      // if next sort preference direction is not null, toggle direction
      if (nextSortPreference.direction) {
        // use fresh state to pick up new =sort (if statement above)
        const sortId = findDescendant(getState(), id, '=sort')
        const pathSort = unroot([...simplePath, sortId] as Path)
        dispatch(
          toggleAttribute({
            path: pathSort!,
            values: [nextSortPreference.type, nextSortPreference.direction],
          }),
        )
      }
    }
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state

    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH

    return getSortPreference(state, head(path)).type === 'Alphabetical'
  },
}

export default toggleSortShortcut
