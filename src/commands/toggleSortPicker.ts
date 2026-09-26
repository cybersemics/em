import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import Icon from '../components/icons/SortWithPicker'
import { getChildrenRanked, getSortComparator, isVisible } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isEmptyOrEmojiOnly from '../util/isEmptyOrEmojiOnly'
import isRoot from '../util/isRoot'

const toggleSortCommand = {
  id: 'toggleSortPicker',
  label: 'Sort Picker' as const,
  description: 'Open a sort picker to pick the sort option and sort by option.',
  multicursor: false,
  hideFromHelp: true,
  hideFromDesktopCommandUniverse: true,
  svg: Icon,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    if (!state.cursor || isRoot(state.cursor)) return

    // Toggle the sort picker dropdown
    dispatch(toggleDropdown({ dropDownType: 'sortPicker' }))
  },
  isActive: state => {
    if (!state.cursor || isRoot(state.cursor)) return false

    const path = simplifyPath(state, rootedParentOf(state, state.cursor))
    const sortPreference = getSortPreference(state, head(path))
    return ['Alphabetical', 'Created', 'Updated', 'Note'].includes(sortPreference.type)
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

    const comparator = getSortComparator(state, id)
    if (!comparator) return null

    // Ignore thoughts that are placed rather than sorted: empty and emoji-only thoughts, which are sorted to their
    // point of creation, and hidden attributes, which are inserted above their siblings by getPrevRank no matter what
    // the sort condition says. Archiving a thought creates =archive that way, and under Updated its lastUpdated is
    // now, so its rank inverts against every sibling in either direction (#4086).
    const childrenRanked = getChildrenRanked(state, id).filter(
      child => isVisible(state, child) && !isEmptyOrEmojiOnly(child.value),
    )

    // The ranks match the sort condition as long as the rank order contains no strict inversion, i.e. no adjacent
    // pair where the earlier-ranked thought sorts after the later-ranked one. Thoughts with equal sort keys, e.g.
    // duplicate values, are ordered by rank by the comparator itself, so they never produce a false error (#4483).
    return childrenRanked.some((child, i) => i > 0 && comparator(childrenRanked[i - 1], child) > 0)
      ? 'Ranks do not match sort condition'
      : null
  },
} satisfies Command

export default toggleSortCommand
