import Shortcut from '../@types/Shortcut'
import alert from '../action-creators/alert'
import toggleSort from '../action-creators/toggleSort'
import Icon from '../components/icons/Sort'
import { HOME_PATH } from '../constants'
import getSortPreference from '../selectors/getSortPreference'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'

const toggleSortShortcut: Shortcut = {
  id: 'toggleSort',
  label: 'Sort',
  description:
    'Change the sorting option for the current context. Rotates through manual, alphabetical, and reverse alphabetical.',
  keyboard: { key: 's', meta: true, alt: true },
  svg: Icon,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const simplePath = state.cursor ? simplifyPath(state, state.cursor) : HOME_PATH
    const id = head(simplePath)

    dispatch(toggleSort({ simplePath }))

    // if the user used the keyboard to activate the shortcut, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const stateNew = getState()
      const sortPreference = getSortPreference(stateNew, id)
      const sortDirectionLabel = sortPreference.direction === 'Asc' ? 'ascending' : 'descending'
      dispatch(alert(sortPreference.direction ? `Sort ${sortDirectionLabel}` : 'Sort manually', { clearDelay: 2000 }))
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
