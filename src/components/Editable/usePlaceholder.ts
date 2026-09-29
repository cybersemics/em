import { unescape as unescapeHtml } from 'html-escaper'
import { useSelector } from 'react-redux'
import Path from '../../@types/Path'
import SimplePath from '../../@types/SimplePath'
import { Settings } from '../../constants'
import attributeEquals from '../../selectors/attributeEquals'
import getThoughtById from '../../selectors/getThoughtById'
import getUserSetting from '../../selectors/getUserSetting'
import isMulticursorPath from '../../selectors/isMulticursorPath'
import rootedParentOf from '../../selectors/rootedParentOf'
import head from '../../util/head'
import strip from '../../util/strip'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

/** Generates the placeholder text for the thought. Automatically changes from 'Add a thought' to 'This is an empty thought' after a short delay. Handles the special case where the cursor is in a clear state due to the clearThought command. */
const usePlaceholder = ({ isEditing, path, simplePath }: { isEditing: boolean; path: Path; simplePath: SimplePath }) =>
  useSelector(state => {
    // A thought is displayed as cleared when clearThought is active and it is either the cursor thought (single clear)
    // or a member of a multiselection (multiselect clear).
    const isCursorCleared = state.cursorCleared && (isEditing || isMulticursorPath(state, path))
    const thought = getThoughtById(state, head(simplePath))
    if (!thought) return ''

    const { value } = thought
    if (!isCursorCleared && value) return value

    // strip formatting tags for clearThought placeholder
    const valueStripped = isCursorCleared ? unescapeHtml(strip(value, { preserveFormatting: false })) : null

    if (valueStripped) return valueStripped

    const parentId = head(rootedParentOf(state, simplePath))
    const isTableColumn1 = attributeEquals(state, parentId, '=view', 'Table')
    const experienceMode = getUserSetting(state, Settings.experienceMode)
    const emptyValue =
      experienceMode || isTableColumn1
        ? ''
        : // only check the time if value is non-empty, otherwise the result will change for non-empty thoughts and cause the ContentEditable to re-render even when the placeholder is not displayed.
          Date.now() - thought.lastUpdated > EMPTY_THOUGHT_TIMEOUT
          ? 'This is an empty thought'
          : 'Add a thought'

    return emptyValue
  })

export default usePlaceholder
