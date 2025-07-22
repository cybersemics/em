import { useMemo } from 'react'
import { CONTENT_BOX_PADDING_LEFT, CONTENT_BOX_PADDING_RIGHT } from '../constants'
import viewportStore from '../stores/viewport'

interface DropHoverLengthProps {
  isTableCol1?: boolean // For dropping into place as a first column in table view
  isTableCol2?: boolean // For dropping into place as a second column in table view
}

/**
 * Returns the appropriate width for drop hover bars during drag-and-drop operations.
 *
 * ## Table View Context
 *
 * Table view is enabled when a thought has the `=view: Table` attribute. This creates a two-column
 * layout where:
 * - **Column 1 (col1)**: Direct children of the thought with `=view: Table`
 * - **Column 2 (col2)**: Grandchildren (children of col1 thoughts)
 *
 * ## When to Use Table Column Props
 *
 * ### Use `isTableCol1: true` when:
 * 1. DropHover: The drop target is within a thought that is a direct child of a `=view: Table` parent
 * - Check: `attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table')`
 * - Example: Dropping onto "A" or "B" in a table where "A" and "B" are col1 thoughts.
 *
 * 2. DropEnd: The drop target represents dropping at the end of a table column 1 context
 * - Used when the parent has `=view: Table` and you're dropping after the last col1 thought
 *
 * ### Use `isTableCol2: true` when:
 * 1. DropHover: The drop target is within a thought that is a grandchild of a `=view: Table` context
 * - Check: `attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table')`.
 * - Example: Dropping onto "Atlanta" or "Boston" where they are children of col1 thoughts "A" and "B".
 *
 * 2. DropEnd: Used with `isTableCol2: isParentTableCol1` pattern where the parent is col1
 * - This positions the drop target correctly for dropping after table col2 content.
 *
 * 3. DropUncle: When dropping after a hidden parent in table col2 context
 * - Check: `attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table')`.
 *
 * 4. DropCliff: When dropping after cliffs in table view to account for col1 width
 * - Used to shift drop targets left by col1 width when transitioning out of table view.
 *
 * ## Component-Specific Usage Patterns
 *
 * - DropHover: Always checks both col1 and col2 status based on thought position
 * - DropEnd: Uses `isTableCol2: isParentTableCol1` pattern (parent is col1, so this is col2)
 * - DropUncle: Checks if in col2 context for proper positioning
 * - DropCliff: Uses col2 flag to adjust positioning when exiting table view.
 *
 * ## Width Behavior
 *
 * - Table view (`isTableCol1 || isTableCol2`): Returns `'50vw'` (50% of viewport width)
 * - Normal view: Returns `contentWidth - padding` in pixels for full content width.
 *
 * @param props.isTableCol1 - True when drop target is in table column 1 (direct children of =view:Table).
 * @param props.isTableCol2 - True when drop target is in table column 2 (grandchildren of =view:Table).
 * @returns CSS width value as string.
 */
const useDropHoverWidth = (props?: DropHoverLengthProps) => {
  const contentWidth = viewportStore.useSelector(state => state.contentWidth)
  const isTableCol1 = props?.isTableCol1
  const isTableCol2 = props?.isTableCol2

  return useMemo(
    () =>
      isTableCol1 || isTableCol2
        ? '50vw' // Table view mode: 50% of viewport width for two-column layout
        : `${contentWidth - CONTENT_BOX_PADDING_RIGHT - CONTENT_BOX_PADDING_LEFT}px`, // Normal mode: Content width minus padding
    [contentWidth, isTableCol1, isTableCol2],
  )
}

export default useDropHoverWidth
