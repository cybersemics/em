import Command from '../@types/Command'
import Icon from '../components/icons/SortWithPicker'
import { getAllChildrenSorted, getChildrenRanked } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isRoot from '../util/isRoot'

const toggleSortCommand: Command = {
  id: 'toggleSortPicker',
  label: 'SortPicker',
  description: 'Open a sort picker to pick the sort option and sort by option.',
  multicursor: false,
  hideFromHelp: true,
  hideFromCommandPalette: true,
  svg: Icon,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    if (!state.cursor || isRoot(state.cursor)) return

    // Toggle the sort picker dropdown
    if (state.showColorPicker) dispatch({ type: 'toggleColorPicker' })
    if (state.showLetterCase) dispatch({ type: 'toggleLetterCase' })
    dispatch({ type: 'toggleSortPicker' })
  },
  isActive: state => {
    if (!state.cursor || isRoot(state.cursor)) return false

    const path = simplifyPath(state, rootedParentOf(state, state.cursor))
    return getSortPreference(state, head(path)).type === 'Alphabetical'
  },
  isDropdownOpen: state => !!state.showSortPicker,
  // Show an error if the ranks do not match the sort condition.
  // This is only needed for migrating to permasort, and can be removed after the migration is complete.
  error: state => {
    if (!state.cursor || isRoot(state.cursor)) return null

    const simplePath = simplifyPath(state, rootedParentOf(state, state.cursor))
    const id = head(simplePath)
    const sortPreference = getSortPreference(state, id)
    if (sortPreference.type === 'None') return null

    // ignore empty thoughts since they are not sorted
    const childrenSorted = getAllChildrenSorted(state, id).filter(child => child.value)
    const childrenRanked = getChildrenRanked(state, id).filter(child => child.value)

    return childrenSorted.length === childrenRanked.length &&
      !childrenRanked.every((_, i) => childrenRanked[i].id === childrenSorted[i].id)
      ? 'Ranks do not match sort condition'
      : null
  },
}

export default toggleSortCommand
