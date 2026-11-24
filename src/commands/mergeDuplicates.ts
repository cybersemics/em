import Command from '../@types/Command'
import { mergeDuplicatesActionCreator as mergeDuplicates } from '../actions/mergeDuplicates'
import hasMulticursor from '../selectors/hasMulticursor'
import isAllSelected from '../selectors/isAllSelected'

const mergeDuplicatesCommand = {
  id: 'mergeDuplicates',
  label: 'Merge Duplicates' as const,
  description: 'Merges all duplicate siblings at the same level as the cursor.',
  gesture: 'du',
  multicursor: {
    // the command merges the whole level, so it only needs to be executed once per level
    filter: 'first-sibling',
  },
  // With every sibling selected, Merge Duplicates would merge their level once, the same as Merge Duplicates alone, so the selection adds nothing. This also disables Select All + Merge Duplicates, whose canExecute sees the state after Select All (#5874).
  canExecute: state => !!state.cursor && !(hasMulticursor(state) && isAllSelected(state)),
  exec: dispatch => {
    dispatch(mergeDuplicates())
  },
} satisfies Command

export default mergeDuplicatesCommand
