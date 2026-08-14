import Command from '../@types/Command'
import { mergeDuplicatesActionCreator as mergeDuplicates } from '../actions/mergeDuplicates'

const mergeDuplicatesCommand: Command = {
  id: 'mergeDuplicates',
  label: 'Merge Duplicates',
  description: 'Merges all duplicate siblings at the same level as the cursor.',
  gesture: 'du',
  multicursor: {
    // the command merges the whole level, so it only needs to be executed once per level
    filter: 'first-sibling',
  },
  canExecute: state => !!state.cursor,
  exec: dispatch => {
    dispatch(mergeDuplicates())
  },
}

export default mergeDuplicatesCommand
