import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { toggleSortActionCreator as toggleSort } from '../actions/toggleSort'
import Icon from '../components/icons/Sort'
import getSortPreference from '../selectors/getSortPreference'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isRoot from '../util/isRoot'

const toggleSortCommand: Command = {
  id: 'toggleSort',
  label: 'Sort',
  description:
    'Change the sorting option for the current context. Rotates through manual, alphabetical, and reverse alphabetical.',
  gesture: 'lurd',
  keyboard: { key: 's', meta: true, alt: true },
  multicursor: {
    filter: 'first-sibling',
  },
  svg: Icon,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    if (!state.cursor || isRoot(state.cursor)) return

    const path = rootedParentOf(state, state.cursor)
    const simplePath = simplifyPath(state, path)
    const id = head(simplePath)

    dispatch(toggleSort({ simplePath }))

    // if the user used the keyboard to activate the command, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const stateNew = getState()
      const sortPreference = getSortPreference(stateNew, id)
      const sortDirectionLabel = sortPreference.direction === 'Asc' ? 'ascending' : 'descending'
      dispatch(
        alert(sortPreference.direction ? `Sort ${sortDirectionLabel}` : 'Sort manually', {
          clearDelay: 2000,
        }),
      )
    }
  },
  isActive: state => {
    if (!state.cursor || isRoot(state.cursor)) return false

    const path = simplifyPath(state, rootedParentOf(state, state.cursor))
    return getSortPreference(state, head(path)).type === 'Alphabetical'
  },
  // Show an error if the ranks do not match the sort condition.
  // This is only needed for migrating to permasort, and can be removed after the migration is complete.
  rounded: true,
}

export default toggleSortCommand
