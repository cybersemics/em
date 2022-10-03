import { useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import attributeEquals from '../../selectors/attributeEquals'
import getThoughtById from '../../selectors/getThoughtById'
import rootedParentOf from '../../selectors/rootedParentOf'
import head from '../../util/head'
import strip from '../../util/strip'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

/** Generates the placeholder text for the thought. Automatically changes from 'Add a thought' to 'This is an empty thought' after a short delay. Handles the special case where the cursor is in a clear state due to the clearThought shortcut. */
const usePlaceholder = ({ isEditing, simplePath }: { isEditing: boolean | undefined; simplePath: SimplePath }) => {
  const isCursorCleared = useSelector((state: State) => isEditing && state.cursorCleared)
  const parentId = useSelector((state: State) => head(rootedParentOf(state, simplePath)))
  const lastUpdated = useSelector((state: State) => getThoughtById(state, head(simplePath)).lastUpdated)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)
  const isTableColumn1 = useSelector((state: State) => attributeEquals(state, parentId, '=view', 'Table'))

  // strip formatting tags for clearThought placeholder
  const valueStripped = isCursorCleared ? unescape(strip(value, { preserveFormatting: false })) : null

  return isCursorCleared
    ? valueStripped || 'This is an empty thought'
    : isTableColumn1
    ? ''
    : Date.now() - new Date(lastUpdated).getTime() > EMPTY_THOUGHT_TIMEOUT
    ? 'This is an empty thought'
    : 'Add a thought'
}

export default usePlaceholder
